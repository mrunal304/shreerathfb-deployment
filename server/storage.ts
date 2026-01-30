import { Feedback, InsertFeedback, ContactUpdate, AnalyticsData } from "@shared/schema";
import mongoose, { Schema, Document } from "mongoose";

// Mongoose Schema Definition
interface IFeedback extends Document {
  name: string;
  phoneNumber: string;
  location: string;
  dineType: "dine_in" | "take_out";
  ratings: {
    interior: number;
    food: number;
    service: number;
    staff: number;
    hygiene: number;
  };
  note?: string;
  createdAt: Date;
  contactedAt?: Date;
  contactedBy?: string;
  dateKey: string;
}

const FeedbackSchema = new Schema<IFeedback>({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true, match: /^9\d{9}$/ },
  location: { type: String, required: true },
  dineType: { type: String, enum: ["dine_in", "take_out"], required: true },
  ratings: {
    interior: { type: Number, min: 1, max: 5, required: true },
    food: { type: Number, min: 1, max: 5, required: true },
    service: { type: Number, min: 1, max: 5, required: true },
    staff: { type: Number, min: 1, max: 5, required: true },
    hygiene: { type: Number, min: 1, max: 5, required: true }
  },
  note: { type: String, maxlength: 500, default: "" },
  createdAt: { type: Date, default: Date.now },
  contactedAt: Date,
  contactedBy: String,
  dateKey: { type: String, required: true } // "YYYY-MM-DD"
});

// Index for checking duplicates: phoneNumber + dateKey must be unique
FeedbackSchema.index({ phoneNumber: 1, dateKey: 1 }, { unique: true });

export const FeedbackModel = mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export interface IStorage {
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedback(filters: { page: number; limit: number; search?: string; date?: string; rating?: number }): Promise<{ data: Feedback[]; total: number }>;
  markContacted(id: string, update: ContactUpdate): Promise<Feedback | null>;
  getAnalytics(period: 'week' | 'month'): Promise<AnalyticsData>;
}

export class MongoStorage implements IStorage {
  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const feedback = new FeedbackModel({
      ...insertFeedback,
      dateKey,
      createdAt: now
    });

    const saved = await feedback.save();
    return this.mapDocument(saved);
  }

  async getFeedback(filters: { page: number; limit: number; search?: string; date?: string; rating?: number }): Promise<{ data: Feedback[]; total: number }> {
    const query: any = {};

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.date) {
      query.dateKey = filters.date;
    }

    if (filters.rating) {
      // Find feedbacks where ANY category matches or average matches?
      // "Sort by ... rating" usually implies average, but filtering by rating could mean average >= X.
      // Let's implement filtering where average rating is >= specified value
      // This is hard to do in simple find without aggregation, let's stick to simple match if possible or aggregation.
      // For simplicity in this iteration: Filter where 'ratings.food' >= rating (as a proxy) OR complex $expr
      // Let's use aggregation pipeline if complex, but for MVP let's filter if ANY rating is >= value
      // query['ratings.food'] = { $gte: filters.rating }; // Simplification
    }
    
    // Sort logic can be added later, defaulting to createdAt desc
    const skip = (filters.page - 1) * filters.limit;
    
    const [data, total] = await Promise.all([
      FeedbackModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit),
      FeedbackModel.countDocuments(query)
    ]);

    return {
      data: data.map(this.mapDocument),
      total
    };
  }

  async markContacted(id: string, update: ContactUpdate): Promise<Feedback | null> {
    const updated = await FeedbackModel.findByIdAndUpdate(
      id,
      { 
        contactedBy: update.contactedBy,
        contactedAt: new Date() 
      },
      { new: true }
    );
    return updated ? this.mapDocument(updated) : null;
  }

  async getAnalytics(period: 'week' | 'month'): Promise<AnalyticsData> {
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (period === 'week' ? 7 : 30));

    // 1. Total Feedback & Response Rate & Top Category (Aggregation)
    const matchStage = { createdAt: { $gte: startDate } };
    
    const stats = await FeedbackModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          contacted: { $sum: { $cond: [{ $ifNull: ["$contactedAt", false] }, 1, 0] } },
          avgInterior: { $avg: "$ratings.interior" },
          avgFood: { $avg: "$ratings.food" },
          avgService: { $avg: "$ratings.service" },
          avgStaff: { $avg: "$ratings.staff" },
          avgHygiene: { $avg: "$ratings.hygiene" },
        }
      }
    ]);

    const result = stats[0] || { total: 0, contacted: 0, avgInterior: 0, avgFood: 0, avgService: 0, avgStaff: 0, avgHygiene: 0 };
    
    // Calculate Average Rating Overall
    const categories = ['interior', 'food', 'service', 'staff', 'hygiene'];
    const averages = {
      interior: result.avgInterior || 0,
      food: result.avgFood || 0,
      service: result.avgService || 0,
      staff: result.avgStaff || 0,
      hygiene: result.avgHygiene || 0,
    };
    
    const overallAvg = (averages.interior + averages.food + averages.service + averages.staff + averages.hygiene) / 5;
    
    // Find top category
    let topCategory = 'food';
    let maxVal = -1;
    for (const [cat, val] of Object.entries(averages)) {
      if (val > maxVal) {
        maxVal = val;
        topCategory = cat;
      }
    }

    // 2. Weekly Trends (Last 7 days logic)
    // We can just fetch all data and aggregate in JS for simplicity or use complex aggregation
    // Let's use a simplified aggregation for trends
    const trends = await FeedbackModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          interior: { $avg: "$ratings.interior" },
          food: { $avg: "$ratings.food" },
          service: { $avg: "$ratings.service" },
          staff: { $avg: "$ratings.staff" },
          hygiene: { $avg: "$ratings.hygiene" },
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Category Performance
    const categoryPerformance = categories.map(cat => ({
      category: cat,
      rating: averages[cat as keyof typeof averages]
    }));

    // 4. Feedback Volume
    const feedbackVolume = [
      { name: 'Contacted', value: result.contacted },
      { name: 'Pending', value: result.total - result.contacted }
    ];

    return {
      totalFeedback: result.total,
      averageRating: Number(overallAvg.toFixed(1)),
      responseRate: result.total > 0 ? Math.round((result.contacted / result.total) * 100) : 0,
      topCategory: topCategory.charAt(0).toUpperCase() + topCategory.slice(1),
      weeklyTrends: trends.map(t => ({
        date: t._id,
        interior: Number(t.interior.toFixed(1)),
        food: Number(t.food.toFixed(1)),
        service: Number(t.service.toFixed(1)),
        staff: Number(t.staff.toFixed(1)),
        hygiene: Number(t.hygiene.toFixed(1)),
      })),
      categoryPerformance,
      feedbackVolume
    };
  }

  private mapDocument(doc: IFeedback): Feedback {
    const obj = doc.toObject();
    return {
      name: obj.name,
      phoneNumber: obj.phoneNumber,
      location: obj.location || "Location 1", // Ensure location is present
      dineType: obj.dineType || "dine_in",
      ratings: obj.ratings,
      note: obj.note || "",
      createdAt: doc.createdAt.toISOString(),
      contactedAt: doc.contactedAt?.toISOString(),
      contactedBy: obj.contactedBy || null,
      dateKey: obj.dateKey,
      _id: doc._id.toString(),
    };
  }
}

export const storage = new MongoStorage();

import { Feedback, InsertFeedback, ContactUpdate, AnalyticsData, Visit } from "@shared/schema";
import mongoose, { Schema, Document } from "mongoose";

// Mongoose Schema Definition
interface IVisit {
  location: string;
  dineType: "dine_in" | "take_out";
  ratings: {
    foodQuality: number;
    foodTaste: number;
    staffBehavior: number;
    hygiene: number;
    ambience: number;
    serviceSpeed: number;
  };
  note?: string;
  staffName?: string;
  staffComment?: string;
  createdAt: Date;
  dateKey: string;
}

interface IFeedback extends Document {
  name: string;
  phoneNumber: string;
  visits: IVisit[];
  contactedAt?: Date;
  contactedBy?: string;
}

const VisitSchema = new Schema<IVisit>({
  location: { type: String, required: true },
  dineType: { type: String, enum: ["dine_in", "take_out"], required: true },
  ratings: {
    foodQuality: { type: Number, min: 1, max: 5, required: true },
    foodTaste: { type: Number, min: 1, max: 5, required: true },
    staffBehavior: { type: Number, min: 1, max: 5, required: true },
    hygiene: { type: Number, min: 1, max: 5, required: true },
    ambience: { type: Number, min: 1, max: 5, required: true },
    serviceSpeed: { type: Number, min: 1, max: 5, required: true }
  },
  note: { type: String, maxlength: 500, default: "" },
  staffName: { type: String, default: "" },
  staffComment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  dateKey: { type: String, required: true }
});

const FeedbackSchema = new Schema<IFeedback>({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true, match: /^\d{10}$/ },
  visits: [VisitSchema],
  contactedAt: Date,
  contactedBy: String,
});

// Index for unique phone number
FeedbackSchema.index({ phoneNumber: 1 }, { unique: true });

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
    const dateKey = now.toISOString().split('T')[0];

    const visit: IVisit = {
      location: insertFeedback.location,
      dineType: insertFeedback.dineType,
      ratings: insertFeedback.ratings,
      note: insertFeedback.note,
      staffName: insertFeedback.staffName,
      staffComment: insertFeedback.staffComment,
      createdAt: now,
      dateKey
    };

    let feedback = await FeedbackModel.findOne({ phoneNumber: insertFeedback.phoneNumber });

    if (feedback) {
      // Check if already submitted today
      const alreadySubmittedToday = (feedback.visits || []).some(v => v.dateKey === dateKey);
      if (alreadySubmittedToday) {
        const error: any = new Error("Already submitted today");
        error.code = 11000;
        throw error;
      }
      if (!feedback.visits) feedback.visits = [];
      feedback.visits.push(visit);
      await feedback.save();
    } else {
      feedback = new FeedbackModel({
        name: insertFeedback.name,
        phoneNumber: insertFeedback.phoneNumber,
        visits: [visit]
      });
      await feedback.save();
    }

    return this.mapDocument(feedback);
  }

  async getFeedback(filters: { page: number; limit: number; search?: string; date?: string; rating?: number }): Promise<{ data: Feedback[]; total: number }> {
    const query: any = {};

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (filters.page - 1) * filters.limit;

    const [data, total] = await Promise.all([
      FeedbackModel.find(query).sort({ "visits.createdAt": -1 }).skip(skip).limit(filters.limit),
      FeedbackModel.countDocuments(query)
    ]);

    return {
      data: data.map(doc => this.mapDocument(doc)),
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
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (period === 'week' ? 7 : 30));

    const stats = await FeedbackModel.aggregate([
      { $unwind: "$visits" },
      { $match: { "visits.createdAt": { $gte: startDate } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          contacted: { $sum: { $cond: [{ $ifNull: ["$contactedAt", false] }, 1, 0] } },
          avgFoodQuality: { $avg: "$visits.ratings.foodQuality" },
          avgFoodTaste: { $avg: "$visits.ratings.foodTaste" },
          avgStaffBehavior: { $avg: "$visits.ratings.staffBehavior" },
          avgHygiene: { $avg: "$visits.ratings.hygiene" },
          avgAmbience: { $avg: "$visits.ratings.ambience" },
          avgServiceSpeed: { $avg: "$visits.ratings.serviceSpeed" },
        }
      }
    ]);

    const result = stats[0] || { 
      total: 0, 
      contacted: 0, 
      avgFoodQuality: 0, 
      avgFoodTaste: 0, 
      avgStaffBehavior: 0, 
      avgHygiene: 0,
      avgAmbience: 0,
      avgServiceSpeed: 0
    };
    
    const categories = ['foodQuality', 'foodTaste', 'staffBehavior', 'hygiene', 'ambience', 'serviceSpeed'];
    const averages = {
      foodQuality: result.avgFoodQuality || 0,
      foodTaste: result.avgFoodTaste || 0,
      staffBehavior: result.avgStaffBehavior || 0,
      hygiene: result.avgHygiene || 0,
      ambience: result.avgAmbience || 0,
      serviceSpeed: result.avgServiceSpeed || 0,
    };

    const overallAvg = (averages.foodQuality + averages.foodTaste + averages.staffBehavior + averages.hygiene + averages.ambience + averages.serviceSpeed) / 6;

    let topCategory = 'foodQuality';
    let maxVal = -1;
    for (const [cat, val] of Object.entries(averages)) {
      if (val > maxVal) {
        maxVal = val;
        topCategory = cat;
      }
    }

    const trends = await FeedbackModel.aggregate([
      { $unwind: "$visits" },
      { $match: { "visits.createdAt": { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$visits.createdAt" } },
          foodQuality: { $avg: "$visits.ratings.foodQuality" },
          foodTaste: { $avg: "$visits.ratings.foodTaste" },
          staffBehavior: { $avg: "$visits.ratings.staffBehavior" },
          hygiene: { $avg: "$visits.ratings.hygiene" },
          ambience: { $avg: "$visits.ratings.ambience" },
          serviceSpeed: { $avg: "$visits.ratings.serviceSpeed" },
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      totalFeedback: result.total,
      averageRating: Number(overallAvg.toFixed(1)),
      responseRate: result.total > 0 ? Math.round((result.contacted / result.total) * 100) : 0,
      topCategory: topCategory.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
      weeklyTrends: trends.map(t => ({
        date: t._id,
        foodQuality: Number(t.foodQuality.toFixed(1)),
        foodTaste: Number(t.foodTaste.toFixed(1)),
        staffBehavior: Number(t.staffBehavior.toFixed(1)),
        hygiene: Number(t.hygiene.toFixed(1)),
        ambience: Number(t.ambience.toFixed(1)),
        serviceSpeed: Number(t.serviceSpeed.toFixed(1)),
      })),
      categoryPerformance: categories.map(cat => ({
        category: cat,
        rating: averages[cat as keyof typeof averages]
      })),
      feedbackVolume: [
        { name: 'Contacted', value: result.contacted },
        { name: 'Pending', value: result.total - result.contacted }
      ]
    };
  }

  private mapDocument(doc: IFeedback): Feedback {
    return {
      _id: doc._id.toString(),
      name: doc.name,
      phoneNumber: doc.phoneNumber,
      contactedAt: doc.contactedAt?.toISOString(),
      contactedBy: doc.contactedBy || null,
      visits: (doc.visits || []).map(v => ({
        location: v.location,
        dineType: v.dineType,
        ratings: v.ratings,
        note: v.note || "",
        staffName: v.staffName || "",
        staffComment: v.staffComment || "",
        createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
        dateKey: v.dateKey
      }))
    };
  }
}

export const storage = new MongoStorage();

export const storage = new MongoStorage();

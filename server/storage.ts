import { Feedback, InsertFeedback, ContactUpdate, AnalyticsData, Visit, CustomerCard } from "@shared/schema";
import mongoose, { Schema, Document } from "mongoose";

// Mongoose Schema Definition
interface ICustomerCard extends Document {
  phoneNumber: string;
  name: string;
  totalVisits: number;
  firstVisitDate: Date;
  lastVisitDate: Date;
  visits: mongoose.Types.ObjectId[];
}

const CustomerCardSchema = new Schema<ICustomerCard>({
  phoneNumber: { type: String, required: true, match: /^\d{10}$/ },
  name: { type: String, required: true },
  totalVisits: { type: Number, required: true, default: 1 },
  firstVisitDate: { type: Date, required: true, default: Date.now },
  lastVisitDate: { type: Date, required: true, default: Date.now },
  visits: [{ type: Schema.Types.ObjectId, ref: 'Feedback' }]
});

CustomerCardSchema.index({ phoneNumber: 1 }, { unique: true });

export const CustomerCardModel = mongoose.model<ICustomerCard>("CustomerCard", CustomerCardSchema);

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
  staffName: { type: String, required: false, default: "" },
  staffComment: { type: String, required: false, default: "" },
  createdAt: { type: Date, default: Date.now },
  dateKey: { type: String, required: true }
});

const FeedbackSchema = new Schema<IFeedback>({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
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
      note: insertFeedback.note || "",
      staffName: insertFeedback.staffName || "",
      staffComment: insertFeedback.staffComment || "",
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

    // Update or create CustomerCard
    let customerCard = await CustomerCardModel.findOne({ phoneNumber: insertFeedback.phoneNumber });
    if (customerCard) {
      customerCard.totalVisits += 1;
      customerCard.lastVisitDate = now;
      if (!customerCard.visits.includes(feedback._id as any)) {
        customerCard.visits.push(feedback._id as any);
      }
      await customerCard.save();
    } else {
      customerCard = new CustomerCardModel({
        phoneNumber: insertFeedback.phoneNumber,
        name: insertFeedback.name,
        totalVisits: 1,
        firstVisitDate: now,
        lastVisitDate: now,
        visits: [feedback._id]
      });
      await customerCard.save();
    }

    return {
      feedback: this.mapDocument(feedback),
      customerCard: customerCard ? {
        totalVisits: customerCard.totalVisits,
        firstVisitDate: customerCard.firstVisitDate.toISOString(),
        lastVisitDate: customerCard.lastVisitDate.toISOString(),
      } : null
    };
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
      query["visits.dateKey"] = filters.date;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [data, total] = await Promise.all([
      FeedbackModel.find(query).sort({ "visits.createdAt": -1 }),
      FeedbackModel.countDocuments(query)
    ]);

    let results = data.map(doc => this.mapDocument(doc));
    
    // If filtering by date, we should also filter the visits within each feedback document
    if (filters.date) {
      results = results.map(feedback => ({
        ...feedback,
        visits: feedback.visits.filter(v => v.dateKey === filters.date)
      })).filter(feedback => feedback.visits.length > 0);
    }

    return {
      data: results.slice(skip, skip + filters.limit),
      total: filters.date ? results.length : total
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

  private mapDocument(doc: any): Feedback {
    const rawDoc = doc.toObject ? doc.toObject() : doc;
    
    // Handle old flat schema by converting it to a visit if visits array is empty
    let visits = rawDoc.visits || [];
    if (visits.length === 0 && rawDoc.location) {
      visits = [{
        location: rawDoc.location,
        dineType: rawDoc.dineType || "dine_in",
        ratings: rawDoc.ratings || {
          foodQuality: 5,
          foodTaste: 5,
          staffBehavior: 5,
          hygiene: 5,
          ambience: 5,
          serviceSpeed: 5
        },
        note: rawDoc.note || "",
        staffName: rawDoc.staffName || "",
        staffComment: rawDoc.staffComment || "",
        createdAt: rawDoc.createdAt || new Date(),
        dateKey: rawDoc.dateKey || (rawDoc.createdAt ? new Date(rawDoc.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      }];
    }

    return {
      _id: rawDoc._id.toString(),
      name: rawDoc.name,
      phoneNumber: rawDoc.phoneNumber,
      contactedAt: rawDoc.contactedAt ? (rawDoc.contactedAt instanceof Date ? rawDoc.contactedAt.toISOString() : rawDoc.contactedAt) : undefined,
      contactedBy: rawDoc.contactedBy || null,
      visits: visits.map((v: any) => ({
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

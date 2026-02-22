import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFeedbackSchema, type InsertFeedback } from "@shared/schema";
import { useCreateFeedback } from "@/hooks/use-feedback";
import { useToast } from "@/hooks/use-toast";
import { RatingInput } from "@/components/RatingInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Loader2, UtensilsCrossed, ChefHat, ConciergeBell, Utensils, Sparkles, Building2, ThumbsUp } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createFeedback = useCreateFeedback();

  const form = useForm<InsertFeedback>({
    resolver: zodResolver(insertFeedbackSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      location: "",
      dineType: "dine_in",
      note: "",
      ratings: {
        food: 0,
        service: 0,
        interior: 0,
        staff: 0,
        hygiene: 0,
      },
    },
  });

  const onSubmit = (data: InsertFeedback) => {
    console.log("Submitting feedback:", data);
    createFeedback.mutate(data, {
      onSuccess: (response) => {
        console.log("Feedback submitted successfully:", response);
        setLocation("/thank-you");
      },
      onError: (error: any) => {
        console.error("Feedback submission error full response:", error);
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: error.response?.data?.message || error.message || "Failed to submit feedback",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#FDF8F3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6 sm:p-8"
        >
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary font-display italic mb-2">
              Share Your Experience
            </h1>
            <p className="text-secondary/70">
              Help us serve you better by rating your visit
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-secondary font-semibold">Your Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your name" 
                        className="h-12 border-b border-t-0 border-l-0 border-r-0 rounded-none bg-transparent border-secondary/20 focus:border-primary px-0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-secondary font-semibold">Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+1 234 567 8900" 
                        type="tel"
                        maxLength={10}
                        className="h-12 border-b border-t-0 border-l-0 border-r-0 rounded-none bg-transparent border-secondary/20 focus:border-primary px-0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary font-semibold">Location You Visited:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 border-b border-t-0 border-l-0 border-r-0 rounded-none bg-transparent border-secondary/20 focus:border-primary px-0">
                            <SelectValue placeholder="Please Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Shree Rath">Shree Rath</SelectItem>
                          <SelectItem value="Ice Cream Parlour">Ice Cream Parlour</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dineType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary font-semibold">Dine In / Take Out:</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dine_in" id="dine_in" className="border-primary text-primary" />
                            <Label htmlFor="dine_in" className="text-secondary cursor-pointer">Dine In</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="take_out" id="take_out" className="border-primary text-primary" />
                            <Label htmlFor="take_out" className="text-secondary cursor-pointer">Take Out</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-semibold text-secondary font-display mb-4">Rate Your Experience</h3>
                <div className="space-y-2 divide-y divide-secondary/10">
                  <FormField
                    control={form.control}
                    name="ratings.service"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RatingInput 
                            label="How would you rate the quality of service?" 
                            value={field.value} 
                            onChange={field.onChange}
                            icon={ConciergeBell}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ratings.food"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RatingInput 
                            label="How satisfied were you with the food quality?" 
                            value={field.value} 
                            onChange={field.onChange}
                            icon={Utensils}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ratings.hygiene"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RatingInput 
                            label="How clean and well-maintained was the restaurant?" 
                            value={field.value} 
                            onChange={field.onChange}
                            icon={Sparkles}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ratings.interior"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RatingInput 
                            label="How would you rate the ambience and atmosphere?" 
                            value={field.value} 
                            onChange={field.onChange}
                            icon={Building2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ratings.staff"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RatingInput 
                            label="How likely are you to recommend us to others?" 
                            value={field.value} 
                            onChange={field.onChange}
                            icon={ThumbsUp}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-secondary font-semibold">Additional Comments (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea 
                          placeholder="Tell us what you loved or what we can improve..." 
                          className="min-h-[100px] border border-secondary/20 rounded-lg bg-transparent focus:border-primary resize-none pb-8" 
                          maxLength={500}
                          {...field} 
                        />
                        <div className="absolute bottom-2 right-3 text-xs text-muted-foreground/60">
                          {(field.value || "").length}/500
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={createFeedback.isPending}
                className="w-full h-14 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all duration-300"
              >
                {createFeedback.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </form>
          </Form>
        </motion.div>
        
        <p className="text-center text-secondary/40 text-sm mt-8 pb-4">
          © {new Date().getFullYear()} Restaurant Name. All rights reserved.
        </p>
      </div>
    </div>
  );
}

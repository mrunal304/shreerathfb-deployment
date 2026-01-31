import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { CheckCircle2, Home, ArrowRight } from "lucide-react";

export default function ThankYou() {
  useEffect(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const colors = ["#22c55e", "#78350f", "#f97316", "#D32F2F"]; // green, brown, orange, red

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden text-center bg-[#FFF8E1]/30">
      {/* Subtle Background Decoration */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-2xl w-full z-10"
      >
        {/* Animated Success Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20, 
            delay: 0.2 
          }}
          className="mb-8 relative"
        >
          <div className="w-24 h-24 bg-gradient-to-tr from-accent to-green-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-200/50">
            <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 w-24 h-24 bg-accent/20 rounded-full mx-auto -z-10 blur-md"
          />
        </motion.div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-secondary mb-6 font-display tracking-tight leading-tight">
          Thank <span className="text-primary">You!</span>
        </h1>

        {/* Success Message */}
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-foreground/80 font-medium leading-relaxed mb-10 px-4 max-w-lg mx-auto"
        >
          Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve!
        </motion.p>

        {/* Restaurant Callout Box */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl py-6 px-10 mb-12 inline-block shadow-xl shadow-secondary/5 border border-white relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-secondary/70 text-lg md:text-xl font-medium relative z-10">
            We hope to see you again soon at <span className="text-primary font-bold decoration-primary/30 underline-offset-4 decoration-2">Shree Rath</span>
          </p>
        </motion.div>

        {/* Back Button */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-16"
        >
          <Button 
            asChild 
            className="bg-gradient-to-r from-primary to-[#FF6347] hover:from-[#FF6347] hover:to-primary text-white px-10 h-14 text-lg font-bold rounded-full shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 active:scale-95 group gap-2"
          >
            <Link href="/">
              <Home className="w-5 h-5" />
              Back to Home
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>

        {/* Footer Message */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-secondary/40 text-lg font-medium tracking-wide uppercase text-sm"
        >
          Have a wonderful day!
        </motion.footer>
      </motion.div>
    </div>
  );
}


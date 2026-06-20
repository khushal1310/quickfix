"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow hover:bg-primary-hover border border-primary/20",
        destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
        outline: "border border-border bg-transparent shadow-sm hover:bg-muted text-foreground",
        secondary: "bg-muted text-foreground shadow-sm hover:bg-border",
        ghost: "hover:bg-muted text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "insta-gradient text-white shadow hover:opacity-90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = React.useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = React.useState(false);

    // Magnetic pull coordinates
    const pullX = useMotionValue(0);
    const pullY = useMotionValue(0);

    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
    const smoothX = useSpring(pullX, springConfig);
    const smoothY = useSpring(pullY, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      
      // 1. Radial Glow Coordinates
      setCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      // 2. Magnetic Pull calculation
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;

      // Limit pulling displacement to 7px max
      pullX.set(Math.min(Math.max(distanceX * 0.18, -7), 7));
      pullY.set(Math.min(Math.max(distanceY * 0.18, -7), 7));
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      pullX.set(0);
      pullY.set(0);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        />
      );
    }

    return (
      <motion.button
        ref={buttonRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          x: smoothX,
          y: smoothY,
        }}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        className={cn(buttonVariants({ variant, size, className }))}
        type={props.type || "button"}
        {...props}
      >
        {/* Spotlighting Radial Gradient Layer */}
        {isHovered && (
          <span
            className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 50px at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.22), transparent)`,
            }}
          />
        )}
        <span className="relative z-10 flex items-center justify-center gap-1.5 w-full h-full">{props.children}</span>
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

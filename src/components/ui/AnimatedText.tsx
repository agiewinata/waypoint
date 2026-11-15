"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ─── Stagger-reveal heading (React Bits "split-word" pattern) ─────────── */
interface AnimatedHeadingProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

export function AnimatedHeading({ children, className, style, delay = 0 }: AnimatedHeadingProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const words = children.split(" ");

  return (
    <span ref={ref} className={className} style={{ display: "block", overflow: "hidden", ...style }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block", marginRight: "0.28em" }}
          initial={{ y: "110%", opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
            delay: delay + i * 0.065,
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Fade-in-up block ──────────────────────────────────────────────────── */
interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
}

export function FadeIn({ children, className, style, delay = 0, duration = 0.5 }: FadeInProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Counter — 21st.dev animated number ───────────────────────────────── */
interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedCounter({ value, prefix = "", suffix = "", className, style }: AnimatedCounterProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.3 }}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        {value.toLocaleString()}
      </motion.span>
      {suffix}
    </motion.span>
  );
}

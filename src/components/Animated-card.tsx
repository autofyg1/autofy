"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utility Function ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Card Components ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AnimatedCard({ className, ...props }: CardProps) {
  return (
    <div
      role="region"
      aria-labelledby="card-title"
      aria-describedby="card-description"
      className={cn(
        "group/animated-card relative w-[356px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-900 dark:bg-black",
        className
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: CardProps) {
  return (
    <div
      role="group"
      className={cn(
        "flex flex-col space-y-1.5 border-t border-zinc-200 p-4 dark:border-zinc-900",
        className
      )}
      {...props}
    />
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-black dark:text-white",
        className
      )}
      {...props}
    />
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-neutral-500 dark:text-neutral-400",
        className
      )}
      {...props}
    />
  );
}

export function CardVisual({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("h-[180px] w-[356px] overflow-hidden", className)}
      {...props}
    />
  );
}

// --- AI Workflow Automation Visual Component ---
interface AIWorkflowProps {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
}

export function AIWorkflowAutomation({
  mainColor = "#8b5cf6",
  secondaryColor = "#10b981",
  gridColor = "#80808015",
}: AIWorkflowProps) {
  const [hovered, setHovered] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [showWorkflow, setShowWorkflow] = useState(false);

  const promptText = "Send weekly reports to team";
  const workflowSteps = [
    { icon: "📊", label: "Gather Data", delay: 0 },
    { icon: "🤖", label: "AI Analysis", delay: 200 },
    { icon: "📝", label: "Generate Report", delay: 400 },
    { icon: "✉️", label: "Email Team", delay: 600 },
    { icon: "🔄", label: "Schedule Weekly", delay: 800 },
  ];

  useEffect(() => {
    if (hovered) {
      // Typing animation
      let charIndex = 0;
      const typingInterval = setInterval(() => {
        if (charIndex <= promptText.length) {
          setTypingText(promptText.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typingInterval);
          setTimeout(() => setShowWorkflow(true), 300);
        }
      }, 50);

      // Step animation
      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % (workflowSteps.length + 1));
      }, 800);

      return () => {
        clearInterval(typingInterval);
        clearInterval(stepInterval);
      };
    } else {
      setTypingText("");
      setShowWorkflow(false);
      setCurrentStep(0);
    }
  }, [hovered]);

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <div className="relative h-[180px] w-[356px] overflow-hidden rounded-t-lg bg-gradient-to-br from-purple-50 via-white to-emerald-50 dark:from-gray-900 dark:via-purple-950/20 dark:to-emerald-950/20">
        
        {/* Prompt Input Layer */}
        <PromptInputLayer 
          typingText={typingText}
          hovered={hovered}
          mainColor={mainColor}
        />

        {/* AI Processing Animation */}
        <AIProcessingLayer 
          hovered={hovered}
          showWorkflow={showWorkflow}
          mainColor={mainColor}
          secondaryColor={secondaryColor}
        />

        {/* Workflow Generation Layer */}
        <WorkflowGenerationLayer
          workflowSteps={workflowSteps}
          showWorkflow={showWorkflow}
          currentStep={currentStep}
          mainColor={mainColor}
          secondaryColor={secondaryColor}
        />

        {/* Background Effects */}
        <BackgroundEffects 
          hovered={hovered}
          mainColor={mainColor}
          gridColor={gridColor}
        />

        {/* Status Indicator */}
        <StatusIndicator 
          hovered={hovered}
          showWorkflow={showWorkflow}
        />
      </div>
    </>
  );
}

// --- Sub-components ---

const PromptInputLayer: React.FC<{
  typingText: string;
  hovered: boolean;
  mainColor: string;
}> = ({ typingText, hovered, mainColor }) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-[10]">
      <div className={cn(
        "flex items-center gap-2 rounded-lg border bg-white/90 px-3 py-2 backdrop-blur-sm transition-all duration-300",
        hovered 
          ? "border-purple-300 shadow-lg dark:border-purple-700" 
          : "border-zinc-200 dark:border-zinc-800",
        "dark:bg-black/90"
      )}>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm">💬</span>
          <div className="flex-1">
            {!hovered ? (
              <span className="text-xs text-neutral-400">Enter your workflow prompt...</span>
            ) : (
              <span className="text-xs font-medium text-black dark:text-white">
                {typingText}
                <span className={cn(
                  "inline-block w-[2px] h-3 ml-0.5 bg-purple-500",
                  typingText.length < 28 ? "animate-pulse" : "opacity-0"
                )} />
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300",
          hovered 
            ? "bg-gradient-to-r from-purple-500 to-purple-600 scale-110" 
            : "bg-gray-200 dark:bg-gray-700"
        )}>
          <span className="text-xs">⚡</span>
        </div>
      </div>
    </div>
  );
};

const AIProcessingLayer: React.FC<{
  hovered: boolean;
  showWorkflow: boolean;
  mainColor: string;
  secondaryColor: string;
}> = ({ hovered, showWorkflow, mainColor, secondaryColor }) => {
  return (
    <div className={cn(
      "absolute top-16 left-1/2 -translate-x-1/2 z-[9] transition-all duration-500",
      hovered && !showWorkflow ? "opacity-100 scale-100" : "opacity-0 scale-50"
    )}>
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 shadow-lg">
          <span className="text-xl animate-spin">🤖</span>
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full bg-purple-400 opacity-30 animate-ping" />
        <div className="absolute inset-0 rounded-full bg-purple-400 opacity-20 animate-ping" style={{ animationDelay: "0.2s" }} />
        <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-10 animate-ping" style={{ animationDelay: "0.4s" }} />
      </div>
      <p className="mt-2 text-[10px] font-semibold text-center text-purple-600 dark:text-purple-400">
        AI Processing...
      </p>
    </div>
  );
};

const WorkflowGenerationLayer: React.FC<{
  workflowSteps: Array<{ icon: string; label: string; delay: number }>;
  showWorkflow: boolean;
  currentStep: number;
  mainColor: string;
  secondaryColor: string;
}> = ({ workflowSteps, showWorkflow, currentStep, mainColor, secondaryColor }) => {
  return (
    <div className={cn(
      "absolute bottom-4 left-0 right-0 z-[8] px-4 transition-all duration-700",
      showWorkflow ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
    )}>
      <div className="flex items-center justify-between">
        {workflowSteps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step Node */}
            <div
              className={cn(
                "relative flex flex-col items-center transition-all duration-500",
                index <= currentStep ? "scale-100" : "scale-75"
              )}
              style={{ transitionDelay: `${step.delay}ms` }}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg shadow-md transition-all duration-300",
                  index <= currentStep
                    ? "bg-gradient-to-br from-purple-500 to-emerald-500 shadow-purple-300/50"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <span className={cn(
                  "text-base transition-transform duration-300",
                  index === currentStep ? "scale-125" : "scale-100"
                )}>
                  {step.icon}
                </span>
              </div>
              <span className={cn(
                "mt-1 text-[9px] font-medium transition-colors duration-300",
                index <= currentStep
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-600"
              )}>
                {step.label}
              </span>
              
              {/* Active indicator */}
              {index === currentStep && (
                <div className="absolute -top-1 -right-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </div>

            {/* Connection Line */}
            {index < workflowSteps.length - 1 && (
              <div className="relative flex-1 h-[2px] mx-1">
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-500",
                    index < currentStep ? "scale-x-100" : "scale-x-0"
                  )}
                  style={{ 
                    transformOrigin: "left",
                    transitionDelay: `${step.delay + 100}ms` 
                  }}
                />
                {/* Flow particle */}
                {index === currentStep - 1 && (
                  <div className="absolute top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white animate-pulse" 
                    style={{ left: "50%" }} />
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const BackgroundEffects: React.FC<{
  hovered: boolean;
  mainColor: string;
  gridColor: string;
}> = ({ hovered, mainColor, gridColor }) => {
  return (
    <>
      {/* Grid Layer */}
      <div
        style={{ "--grid-color": gridColor } as React.CSSProperties}
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full bg-transparent bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:20px_20px] bg-center opacity-70 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 z-[2]">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute h-1 w-1 rounded-full opacity-30 transition-all duration-1000",
              hovered ? "animate-pulse" : ""
            )}
            style={{
              backgroundColor: i % 2 === 0 ? mainColor : "#10b981",
              left: `${10 + (i * 45)}px`,
              top: `${20 + (i % 3) * 50}px`,
              animationDelay: `${i * 200}ms`,
              transform: hovered ? `translateY(-${(i + 1) * 5}px)` : "translateY(0)",
            }}
          />
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className={cn(
        "absolute inset-0 z-[3] transition-opacity duration-500",
        hovered ? "opacity-100" : "opacity-0"
      )}>
        <svg width="356" height="180" viewBox="0 0 356 180" fill="none">
          <rect width="356" height="180" fill="url(#gradient)" />
          <defs>
            <radialGradient id="gradient" cx="0.5" cy="0.5" r="0.5">
              <stop stopColor={mainColor} stopOpacity="0.1" />
              <stop offset="1" stopColor={mainColor} stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </>
  );
};

const StatusIndicator: React.FC<{
  hovered: boolean;
  showWorkflow: boolean;
}> = ({ hovered, showWorkflow }) => {
  return (
    <div className="absolute top-4 right-4 z-[10]">
      <div className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-all duration-300",
        hovered
          ? showWorkflow
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
            : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      )}>
        <div className={cn(
          "h-1.5 w-1.5 rounded-full",
          hovered
            ? showWorkflow
              ? "bg-emerald-500 animate-pulse"
              : "bg-purple-500 animate-pulse"
            : "bg-gray-400"
        )} />
        {hovered ? (showWorkflow ? "Automated" : "Processing") : "Ready"}
      </div>
    </div>
  );
};
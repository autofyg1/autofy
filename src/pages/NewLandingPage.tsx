import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);
import { 
  ArrowRight, 
  Zap, 
  Mail,
  MessageSquare,
  Calendar,
  Database,
  Bot,
  Workflow,
  BarChart3,
  Shield,
  Clock,
  Users
} from 'lucide-react';
import WorkflowDemo from '../components/WorkflowDemo';
import { AIWorkflowAutomation } from '../components/animated-card';

// Utility function for class names
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Card Components
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

function AnimatedCard({ className, ...props }: CardProps) {
  return (
    <div
      role="region"
      aria-labelledby="card-title"
      aria-describedby="card-description"
      className={cn(
        "group/animated-card relative w-[380px] overflow-hidden rounded-2xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:scale-105",
        className
      )}
      {...props}
    />
  )
}

function CardBody({ className, ...props }: CardProps) {
  return (
    <div
      role="group"
      className={cn(
        "flex flex-col space-y-3 border-t border-gray-200/30 p-6 ",
        className
      )}
      {...props}
    />
  )
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-xl leading-none font-bold tracking-tight text-gray-900",
        className
      )}
      {...props}
    />
  )
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed text-gray-600",
        className
      )}
      {...props}
    />
  )
}

function CardVisual({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("h-[200px] w-[480px] overflow-hidden", className)}
      {...props}
    />
  )
}

// Visual Component Props
interface VisualProps {
  mainColor?: string
  secondaryColor?: string
  gridColor?: string
}

// Shared Components
const EllipseGradient: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="absolute inset-0 z-[5] flex h-full w-full items-center justify-center">
      <svg
        width="380"
        height="200"
        viewBox="0 0 380 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="380" height="200" fill="url(#paint0_radial)" />
        <defs>
          <radialGradient
            id="paint0_radial"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(190 100) rotate(90) scale(100 190)"
          >
            <stop stopColor={color} stopOpacity="0.3" />
            <stop offset="0.4" stopColor={color} stopOpacity="0.2" />
            <stop offset="1" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

const GridLayer: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div
      style={{ "--grid-color": color } as React.CSSProperties}
      className="pointer-events-none absolute inset-0 z-[4] h-full w-full bg-transparent bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] bg-[size:24px_24px] bg-center opacity-60"
    />
  )
}

// Visual 1: Workflow Automation Analytics
const WorkflowAnalyticsVisual: React.FC<VisualProps> = ({
  mainColor = "#8b5cf6",
  secondaryColor = "#06b6d4",
  gridColor = "#80808020",
}) => {
  const [hovered, setHovered] = useState(false)
  const [automationProgress, setAutomationProgress] = useState(25)
  const [efficiencyProgress, setEfficiencyProgress] = useState(0)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (hovered) {
      timeout = setTimeout(() => {
        setAutomationProgress(85)
        setEfficiencyProgress(92)
      }, 300)
    } else {
      setAutomationProgress(25)
      setEfficiencyProgress(0)
    }

    return () => clearTimeout(timeout)
  }, [hovered])

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const automationDashoffset = circumference - (automationProgress / 100) * circumference
  const efficiencyDashoffset = circumference - (efficiencyProgress / 100) * circumference

  const automationMetrics = [
    { id: 1, translateX: "120", translateY: "60", text: "Email", icon: "📧" },
    { id: 2, translateX: "120", translateY: "-60", text: "Slack", icon: "💬" },
    { id: 3, translateX: "140", translateY: "0", text: "Calendar", icon: "📅" },
    { id: 4, translateX: "-140", translateY: "0", text: "Database", icon: "🗄️" },
    { id: 5, translateX: "-120", translateY: "60", text: "API", icon: "🔗" },
    { id: 6, translateX: "-120", translateY: "-60", text: "Webhook", icon: "🎯" },
  ]

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <div className="relative h-[200px] w-[380px] overflow-hidden rounded-t-2xl">
        {/* Main Automation Chart */}
        <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute top-0 left-0 z-[7] flex h-[400px] w-[380px] transform items-center justify-center transition-transform duration-700 group-hover/animated-card:-translate-y-[100px] group-hover/animated-card:scale-110">
          <div className="relative flex h-[140px] w-[140px] items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                opacity={0.1}
                className="text-gray-400"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={secondaryColor}
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={efficiencyDashoffset}
                transform="rotate(-90 50 50)"
                style={{
                  transition: "stroke-dashoffset 0.7s cubic-bezier(0.6, 0.6, 0, 1)",
                }}
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={mainColor}
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={automationDashoffset}
                transform="rotate(-90 50 50)"
                style={{
                  transition: "stroke-dashoffset 0.7s cubic-bezier(0.6, 0.6, 0, 1)",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">
                {hovered ? (efficiencyProgress > 75 ? efficiencyProgress : automationProgress) : automationProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* Automation Badge */}
        <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[6] flex w-[380px] translate-y-0 items-start justify-center bg-transparent p-6 transition-transform duration-700 group-hover/animated-card:translate-y-full">
          <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] rounded-lg border border-gray-200/40 bg-white/60 px-4 py-3 opacity-100 backdrop-blur-md transition-opacity duration-500 group-hover/animated-card:opacity-0">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: mainColor }} />
              <p className="text-sm font-medium text-gray-900">
                Workflow Efficiency
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Automated task completion rate
            </p>
          </div>
        </div>

        {/* Integration Items */}
        <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[7] flex items-center justify-center opacity-0 transition-opacity duration-700 group-hover/animated-card:opacity-100">
          {automationMetrics.map((item, index) => (
            <div
              key={item.id}
              className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute flex items-center justify-center gap-2 rounded-full border border-gray-200/60 bg-white/90 px-3 py-1.5 backdrop-blur-md transition-all duration-700"
              style={{
                transform: hovered
                  ? `translate(${item.translateX}px, ${item.translateY}px)`
                  : "translate(0px, 0px)",
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-xs font-medium text-gray-900">
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <EllipseGradient color={mainColor} />
        <GridLayer color={gridColor} />
      </div>
    </>
  )
}

// Visual 2: Data Flow Animation
const DataFlowVisual: React.FC<VisualProps> = ({
  mainColor = "#06b6d4",
  secondaryColor = "#8b5cf6",
  gridColor = "#80808020",
}) => {
  const [hovered, setHovered] = useState(false)

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <div className="relative h-[200px] w-[380px] overflow-hidden rounded-t-2xl">
        {/* Animated Data Streams */}
        <div className="absolute inset-0 z-[6]">
          <svg
            className="absolute top-0 left-0 w-full h-full"
            viewBox="0 0 380 200"
            fill="none"
          >
            {/* Data flow paths */}
            <path
              d="M50,50 Q190,80 330,50"
              stroke={mainColor}
              strokeWidth="3"
              fill="none"
              className={cn(
                "transition-all duration-1000 ease-in-out",
                hovered ? "opacity-100" : "opacity-60"
              )}
              strokeDasharray="5,5"
              strokeDashoffset={hovered ? "0" : "20"}
            />
            <path
              d="M50,100 Q190,70 330,100"
              stroke={secondaryColor}
              strokeWidth="3"
              fill="none"
              className={cn(
                "transition-all duration-1000 ease-in-out",
                hovered ? "opacity-100" : "opacity-60"
              )}
              strokeDasharray="5,5"
              strokeDashoffset={hovered ? "0" : "15"}
              style={{ transitionDelay: "200ms" }}
            />
            <path
              d="M50,150 Q190,120 330,150"
              stroke="#10b981"
              strokeWidth="3"
              fill="none"
              className={cn(
                "transition-all duration-1000 ease-in-out",
                hovered ? "opacity-100" : "opacity-60"
              )}
              strokeDasharray="5,5"
              strokeDashoffset={hovered ? "0" : "10"}
              style={{ transitionDelay: "400ms" }}
            />
          </svg>
        </div>

        {/* Data Nodes */}
        <div className="absolute inset-0 z-[7]">
          {[
            { x: 50, y: 50, icon: "📊", label: "Input" },
            { x: 190, y: 100, icon: "⚙️", label: "Process" },
            { x: 330, y: 100, icon: "✅", label: "Output" }
          ].map((node, i) => (
            <div
              key={i}
              className={cn(
                "absolute transition-all duration-500 ease-in-out flex flex-col items-center",
                hovered ? "scale-110" : "scale-100"
              )}
              style={{
                left: node.x - 20,
                top: node.y - 20,
                transitionDelay: `${i * 150}ms`,
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                <span className="text-lg">{node.icon}</span>
              </div>
              <span className="text-xs font-medium text-gray-700 mt-1">{node.label}</span>
            </div>
          ))}
        </div>

        <GridLayer color={gridColor} />
      </div>
    </>
  )
}

// Visual 3: Workflow Builder - UPDATED
const WorkflowBuilderVisual: React.FC<VisualProps> = ({
  mainColor = "#6366f1",
  secondaryColor = "#14b8a6",
  gridColor = "#6366f120",
}) => {
  const [hovered, setHovered] = useState(false)
  const [activeNode, setActiveNode] = useState(0)

  useEffect(() => {
    if (hovered) {
      const interval = setInterval(() => {
        setActiveNode((prev) => (prev + 1) % 4)
      }, 500)
      return () => clearInterval(interval)
    } else {
      setActiveNode(0)
    }
  }, [hovered])

  const nodes = [
    { id: 1, x: 60, y: 100, label: "Trigger", icon: "⚡" },
    { id: 2, x: 140, y: 100, label: "Process", icon: "⚙️" },
    { id: 3, x: 220, y: 100, label: "Transform", icon: "🔄" },
    { id: 4, x: 300, y: 100, label: "Deploy", icon: "🚀" },
  ]

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <div className="relative h-[200px] w-[380px] overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-50 via-white to-teal-50">
        
        {/* Connecting Lines */}
        <svg className="absolute inset-0 z-[5] h-full w-full">
          {nodes.slice(0, -1).map((node, i) => (
            <React.Fragment key={i}>
              <line
                x1={node.x + 20}
                y1={node.y}
                x2={nodes[i + 1].x - 20}
                y2={nodes[i + 1].y}
                stroke={mainColor}
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity={hovered && i < activeNode ? 1 : 0.3}
                className="transition-all duration-300"
              />
              {hovered && i === activeNode - 1 && (
                <circle r="3" fill={secondaryColor}>
                  <animateMotion
                    dur="0.5s"
                    repeatCount="1"
                    path={`M ${node.x + 20},${node.y} L ${nodes[i + 1].x - 20},${nodes[i + 1].y}`}
                  />
                </circle>
              )}
            </React.Fragment>
          ))}
        </svg>

        {/* Workflow Nodes */}
        <div className="absolute inset-0 z-[7]">
          {nodes.map((node, i) => (
            <div
              key={node.id}
              className={cn(
                "absolute flex flex-col items-center transition-all duration-500",
                hovered && i <= activeNode ? "scale-110" : "scale-100"
              )}
              style={{
                left: node.x - 30,
                top: node.y - 30,
                transform: hovered && i === activeNode ? "translateY(-10px)" : "translateY(0)",
              }}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl shadow-lg transition-all duration-300 backdrop-blur-sm border",
                  hovered && i <= activeNode
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-300 border-indigo-200"
                    : "bg-white/90 shadow-gray-200 border-gray-200/50"
                )}
              >
                <span className={cn(
                  "text-xl transition-all duration-300",
                  hovered && i <= activeNode ? "scale-125" : "scale-100"
                )}>
                  {node.icon}
                </span>
              </div>
              <span className={cn(
                "mt-2 text-xs font-semibold transition-all duration-300",
                hovered && i <= activeNode 
                  ? "text-indigo-600" 
                  : "text-gray-500"
              )}>
                {node.label}
              </span>
            </div>
          ))}
        </div>

        {/* Status Badge */}
        <div className="absolute top-4 right-4 z-[8]">
          <div className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 backdrop-blur-sm border",
            hovered
              ? "bg-green-100/80 text-green-700 border-green-200/50"
              : "bg-gray-100/80 text-gray-600 border-gray-200/50"
          )}>
            {hovered ? "● Running" : "○ Ready"}
          </div>
        </div>

        <GridLayer color={gridColor} />
      </div>
    </>
  )
}
// Visual 4: Integration Network
const IntegrationNetworkVisual: React.FC<VisualProps> = ({
  mainColor = "#10b981",
  secondaryColor = "#3b82f6",
  gridColor = "#80808020",
}) => {
  const [hovered, setHovered] = useState(false)

  const integrations = [
    { id: 1, x: 190, y: 100, size: 12, icon: "🤖", name: "AI" },
    { id: 2, x: 120, y: 60, size: 8, icon: "📧", name: "Email" },
    { id: 3, x: 260, y: 80, size: 8, icon: "💬", name: "Slack" },
    { id: 4, x: 100, y: 140, size: 8, icon: "📅", name: "Calendar" },
    { id: 5, x: 280, y: 140, size: 8, icon: "📊", name: "Analytics" },
    { id: 6, x: 190, y: 40, size: 6, icon: "🔗", name: "API" },
    { id: 7, x: 190, y: 160, size: 6, icon: "💾", name: "Database" },
  ]

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <div className="relative h-[200px] w-[380px] overflow-hidden rounded-t-2xl">
        {/* Connection Lines */}
        <svg className="absolute inset-0 z-[6] h-full w-full">
          {integrations.map((node, i) =>
            integrations.slice(i + 1).map((targetNode, j) => (
              <line
                key={`${i}-${j}`}
                x1={node.x}
                y1={node.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={hovered ? mainColor : secondaryColor}
                strokeWidth={hovered ? 2 : 1}
                opacity={hovered ? 0.8 : 0.4}
                className="transition-all duration-500 ease-in-out"
                style={{ transitionDelay: `${(i + j) * 50}ms` }}
              />
            ))
          )}
        </svg>

        {/* Integration Nodes */}
        <div className="absolute inset-0 z-[7]">
          {integrations.map((node, i) => (
            <div
              key={node.id}
              className={cn(
                "absolute rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg flex items-center justify-center transition-all duration-500 ease-in-out",
                hovered ? "animate-pulse scale-110" : "scale-100"
              )}
              style={{
                left: node.x - node.size / 2,
                top: node.y - node.size / 2,
                width: node.size * 4,
                height: node.size * 4,
                transitionDelay: `${i * 100}ms`,
              }}
            >
              <span className="text-lg">{node.icon}</span>
            </div>
          ))}
        </div>

        <EllipseGradient color={mainColor} />
        <GridLayer color={gridColor} />
      </div>
    </>
  )
}

// Interactive Cards Component
function InteractiveCards() {
  const cards = [
    {
      visual: <WorkflowAnalyticsVisual />,
      title: "Workflow Analytics",
      description: "Track automation performance with real-time metrics and efficiency monitoring across all your integrations."
    },
    {
      visual: <DataFlowVisual />,
      title: "Data Flow Processing",
      description: "Visualize how data moves through your automated workflows with intelligent routing and processing."
    },
    {
      visual: <WorkflowBuilderVisual />,
      title: "Visual Workflow Builder",
      description: "Build complex automations with our intuitive drag-and-drop interface. No coding required."
    },
    {
      visual: <IntegrationNetworkVisual />,
      title: "Integration Network",
      description: "Connect all your favorite tools and services in a unified automation ecosystem."
    }
  ]

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 place-items-center">
          {cards.map((card, index) => (
            <AnimatedCard key={index} className="feature-card">
              <CardVisual>
                {card.visual}
              </CardVisual>
              <CardBody>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardBody>
            </AnimatedCard>
          ))}
        </div>

        {/* AI Workflow Automation Card - Added below the other cards */}
        <div className="mt-16 flex justify-center ">
          <AnimatedCard className="hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 ai-workflow-card">
            <CardVisual>
              <AIWorkflowAutomation />
            </CardVisual>
            <CardBody>
              <CardTitle>Smart Workflow Creator<br></br><span className='text-sm text-gray-700'>[Upcoming feature]</span></CardTitle>
              <CardDescription>
                Watch as AI transforms your simple text prompt into a complete automated workflow. 
                Hover above to see the step-by-step process unfold in real-time.
              </CardDescription>
            </CardBody>
          </AnimatedCard>
        </div>
      </div>
    </div>
  )
}

const NewLandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState({
    hero: false,
    workflow: false,
    features: false
  });
  const [isHovering, setIsHovering] = useState(false);

  // 3D transform function for hero text
  const get3DTransform = (intensity: number) => {
    return `perspective(1000px) rotateX(${intensity * 2}deg) rotateY(${intensity * 3}deg) translateZ(${intensity * 20}px)`;
  };

  // GSAP ScrollTrigger animations
  useEffect(() => {
    // Smooth scrolling setup
    gsap.config({ force3D: true });
    
    // Set initial states for elements
    gsap.set(".hero-text h1", { y: 50, opacity: 0 });
    gsap.set(".hero-text p", { y: 50, opacity: 0 });
    gsap.set(".hero-buttons", { y: 50, opacity: 0 });
    gsap.set(".workflow-content", { y: 80, opacity: 0 });
    gsap.set(".feature-card", { y: 60, opacity: 0, scale: 0.8 });
    gsap.set(".ai-workflow-card", { y: 80, opacity: 0, scale: 0.8 });
    gsap.set(".integration-item", { y: 30, opacity: 0 });
    gsap.set(".stats-item", { y: 40, opacity: 0 });
    
    // Hero text animation
    if (heroRef.current) {
      const tl = gsap.timeline({ delay: 0.5 });
      tl.to(".hero-text h1", {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power3.out"
      })
      .to(".hero-text p", {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out"
      }, "-=0.8")
      .to(".hero-buttons", {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.6");
    }

    // Workflow section animation
    if (workflowRef.current) {
      gsap.to(".workflow-content", {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        stagger: 0.2,
        scrollTrigger: {
          trigger: workflowRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      });
    }

    // Features section animation
    if (featuresRef.current) {
      gsap.to(".feature-card", {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "back.out(1.7)",
        stagger: 0.2,
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 75%",
          end: "bottom 25%",
          toggleActions: "play none none reverse"
        }
      });

      // AI Workflow Card animation with delay
      gsap.to(".ai-workflow-card", {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: ".ai-workflow-card",
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      });
    }

    // Integration items animation
    gsap.to(".integration-item", {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.05,
      scrollTrigger: {
        trigger: ".integration-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    // Stats animation
    gsap.to(".stats-item", {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.1,
      scrollTrigger: {
        trigger: ".stats-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    // Parallax effect for video
    ScrollTrigger.create({
      trigger: heroRef.current,
      start: "top top",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        const video = heroRef.current?.querySelector('video');
        if (video) {
          gsap.to(video, {
            y: self.progress * 150,
            duration: 0.3,
            ease: "none"
          });
        }
      }
    });

    // Navbar background change on scroll
    ScrollTrigger.create({
      trigger: heroRef.current,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        const nav = document.querySelector('nav');
        if (nav) {
          if (self.progress > 0.1) {
            nav.classList.add('bg-white/95');
            nav.classList.remove('bg-white/90');
          } else {
            nav.classList.add('bg-white/90');
            nav.classList.remove('bg-white/95');
          }
        }
      }
    });

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Minimal Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Autofy</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              to="/login" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link 
              to="/signup" 
              className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="h-screen flex items-center justify-center relative overflow-hidden"
      >
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="https://pmvzgrlufqgbxgpkaqke.supabase.co/storage/v1/object/public/video/background-video.mp4" type="video/mp4" />
            <div className="w-full h-full bg-gradient-to-br from-violet-50/50 via-white to-purple-50/30"></div>
          </video>
          
          {/* Video overlay for better text visibility */}

        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 z-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
             {/* Hero Text Container */}
      <div className="relative z-20 px-4 sm:px-6 lg:px-8 w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center md:text-left md:mx-0 md:absolute md:top-[15%] md:left-16 lg:left-20 xl:left-24 hero-text">
        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight text-gray-900 mb-4 md:mb-6">
          <span className="block sm:inline">Automate Tasks</span>
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Effortlessly
          </span>
        </h1>
        
        <div className="transform transition-all duration-1000" style={{ transform: get3DTransform(0.1) }}>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-900 mb-6 sm:mb-8 max-w-xs sm:max-w-md md:max-w-2xl leading-relaxed drop-shadow-lg mx-auto md:mx-0">
            Transform your workflows with intelligent automation. Connect apps,
            eliminate repetitive tasks, and focus on what truly matters.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start sm:space-x-4 space-y-3 sm:space-y-0 hero-buttons">
            <Link
              to="/signup"
              className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center space-x-2 w-full sm:w-auto justify-center"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <span>Get Started Free</span>
              <ArrowRight
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                  isHovering ? 'translate-x-1' : ''
                }`}
              />
            </Link>
          </div>
        </div>
      </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/80 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* Simple Workflow Demo */}
      <section 
        ref={workflowRef}
        className="py-16 px-6 bg-gray-50/50"
      >
        <div className="max-w-5xl mx-auto">
          <div className="workflow-content text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              See it in action
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Watch how easy it is to connect your favorite apps and automate your workflow
            </p>
          </div>

          <div className="workflow-content relative">
            <WorkflowDemo />
          </div>
        </div>
      </section>

      {/* Interactive Cards - Feature Highlights */}
      <section 
        ref={featuresRef}
        className="py-20 px-6 bg-white"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Powerful automation features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to build, deploy, and scale your workflow automations
            </p>
          </div>

          <InteractiveCards />
        </div>
      </section>

      {/* Simple Integration Preview */}
      <section className="integration-section py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Connect everything
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
            Works with the tools you already love
          </p>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Gmail', icon: Mail, color: 'bg-red-500' },
              { name: 'Slack', icon: MessageSquare, color: 'bg-purple-500' },
              { name: 'Calendar', icon: Calendar, color: 'bg-blue-500' },
              { name: 'Notion', icon: Database, color: 'bg-gray-700' },
              { name: 'AI', icon: Bot, color: 'bg-violet-500' },
              { name: 'Workflow', icon: Workflow, color: 'bg-green-500' },
              { name: 'Analytics', icon: BarChart3, color: 'bg-orange-500' },
              { name: 'Security', icon: Shield, color: 'bg-blue-600' }
            ].map((app, index) => {
              const Icon = app.icon;
              return (
                <div 
                  key={app.name}
                  className="integration-item group flex flex-col items-center space-y-3 hover:scale-110 transition-transform duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{app.name}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-16">
            <p className="text-gray-500 mb-8">And 100+ more integrations</p>
            <Link
              to="/signup"
              className="inline-flex items-center space-x-2 bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 hover:scale-105 transition-all duration-300"
            >
              <span>Start automating</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="stats-section py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="stats-item">
              <div className="text-4xl font-bold text-gray-900 mb-2">50K+</div>
              <p className="text-gray-600">Teams automated</p>
            </div>
            <div className="stats-item">
              <div className="text-4xl font-bold text-gray-900 mb-2">1M+</div>
              <p className="text-gray-600">Tasks completed</p>
            </div>
            <div className="stats-item">
              <div className="text-4xl font-bold text-gray-900 mb-2">99.9%</div>
              <p className="text-gray-600">Uptime guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to automate?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of teams who save hours every week with intelligent automation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/signup"
              className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 hover:scale-105 transition-all duration-300"
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className="text-white border border-white/20 px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
            >
              Sign in
            </Link>
          </div>
          
          <p className="text-gray-400 text-sm mt-6">
            No credit card required • Free forever plan available
          </p>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-6 h-6 rounded bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Autofy</span>
          </div>
          
          <div className="flex items-center space-x-8 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
          </div>
        </div>
      </footer>

      <style>{`
     @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        .font-space-grotesk {
          font-family: 'Space Grotesk', sans-serif;
        }
        
        /* Remove the old Inter font styles */
        .font-inter {
          font-family: 'Space Grotesk', sans-serif;
        }
        
       
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        @media (max-width: 768px) {
          video {
            object-fit: cover !important;
            height: 100vh !important;
            background: #0f0f1a;
          }
          
          .hero-text {
            left: 0 !important;
            top: 5% !important;
            transform: translateY(-50%) !important;
            text-align: center !important;
            padding: 0 1rem !important;
            max-width: 100% !important;
            position: relative !important;
          }
          
          .hero-text h1 {
            font-size: 2.5rem !important;
            line-height: 1.2 !important;
          }
          
          .hero-text p {
            font-size: 1.1rem !important;
          }
          
          .hero-buttons {
            flex-direction: column !important;
            gap: 1rem !important;
            align-items: center !important;
            margin-top: 1.5rem !important;
          }
        }
        
        @media (min-width: 769px) {
          .hero-text {
            position: absolute !important;
            left: 4rem !important;
            top: 15% !important;
            text-align: left !important;
            max-width: 600px !important;
          }
        }
        
        *:focus {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
        }
        
        @media (prefers-contrast: high) {
          .bg-gradient-to-r {
            background: #000 !important;
            color: #fff !important;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          [data-gsap] {
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NewLandingPage;
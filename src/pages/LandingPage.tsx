import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  ArrowRight, 
  Star,
  Github,
  Twitter,
  Mail,
  Sparkles,
  Bot,
  Workflow,
  Shield
} from 'lucide-react';
import Interactive3DModel from '../components/Interactive3DModel';

// Proper IconCloud Component with realistic 3D sphere rotation

interface Icon {

  x: number;

  y: number;

  z: number;

  scale: number;

  opacity: number;

  id: number;

}



interface IconCloudProps {

  images?: string[];

}



function easeOutCubic(t: number): number {

  return 1 - Math.pow(1 - t, 3);

}



const IconCloud = ({ images }: IconCloudProps) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [iconPositions, setIconPositions] = useState<Icon[]>([]);

  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);

  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [targetRotation, setTargetRotation] = useState<{

    x: number;

    y: number;

    startX: number;

    startY: number;

    distance: number;

    startTime: number;

    duration: number;

  } | null>(null);

  const animationFrameRef = useRef<number>();

  const rotationRef = useRef(rotation);

  const iconCanvasesRef = useRef<HTMLCanvasElement[]>([]);

  const imagesLoadedRef = useRef<boolean[]>([]);



  // Create icon canvases once when images change

  useEffect(() => {

    if (!images) return;



    imagesLoadedRef.current = new Array(images.length).fill(false);



    const newIconCanvases = images.map((imageUrl, index) => {

      const offscreen = document.createElement("canvas");

      offscreen.width = 40;

      offscreen.height = 40;

      const offCtx = offscreen.getContext("2d");



      if (offCtx) {

        const img = new Image();

        img.crossOrigin = "anonymous";

        img.src = imageUrl;

        img.onload = () => {

          offCtx.clearRect(0, 0, offscreen.width, offscreen.height);



          // Create circular clipping path

          offCtx.beginPath();

          offCtx.arc(20, 20, 20, 0, Math.PI * 2);

          offCtx.closePath();

          offCtx.clip();



          // Draw the image

          offCtx.drawImage(img, 0, 0, 40, 40);



          imagesLoadedRef.current[index] = true;

        };

      }

      return offscreen;

    });



    iconCanvasesRef.current = newIconCanvases;

  }, [images]);



  // Generate initial icon positions on a sphere using Fibonacci distribution

  useEffect(() => {

    if (!images) return;

    

    const newIcons: Icon[] = [];

    const numIcons = images.length;



    // Fibonacci sphere parameters for even distribution

    const offset = 2 / numIcons;

    const increment = Math.PI * (3 - Math.sqrt(5));



    for (let i = 0; i < numIcons; i++) {

      const y = i * offset - 1 + offset / 2;

      const r = Math.sqrt(1 - y * y);

      const phi = i * increment;



      const x = Math.cos(phi) * r;

      const z = Math.sin(phi) * r;



      newIcons.push({

        x: x * 140, // Increased radius for better visibility

        y: y * 140,

        z: z * 140,

        scale: 1,

        opacity: 1,

        id: i,

      });

    }

    setIconPositions(newIcons);

  }, [images]);



  // Handle mouse events

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {

    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect || !canvasRef.current) return;



    const x = e.clientX - rect.left;

    const y = e.clientY - rect.top;



    setIsDragging(true);

    setLastMousePos({ x: e.clientX, y: e.clientY });

  };



  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {

    const rect = canvasRef.current?.getBoundingClientRect();

    if (rect) {

      const x = e.clientX - rect.left;

      const y = e.clientY - rect.top;

      setMousePos({ x, y });

    }



    if (isDragging) {

      const deltaX = e.clientX - lastMousePos.x;

      const deltaY = e.clientY - lastMousePos.y;



      rotationRef.current = {

        x: rotationRef.current.x + deltaY * 0.005,

        y: rotationRef.current.y + deltaX * 0.005,

      };



      setLastMousePos({ x: e.clientX, y: e.clientY });

    }

  };



  const handleMouseUp = () => {

    setIsDragging(false);

  };



  // Animation and rendering

  useEffect(() => {

    const canvas = canvasRef.current;

    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;



    const animate = () => {

      ctx.clearRect(0, 0, canvas.width, canvas.height);



      const centerX = canvas.width / 2;

      const centerY = canvas.height / 2;

      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

      const dx = mousePos.x - centerX;

      const dy = mousePos.y - centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      const speed = 0.002 + (distance / maxDistance) * 0.008;



      // Auto-rotation when not dragging

      if (!isDragging) {

        rotationRef.current = {

          x: rotationRef.current.x + (dy / canvas.height) * speed,

          y: rotationRef.current.y + (dx / canvas.width) * speed + 0.005, // Constant slow rotation

        };

      }



      // Sort icons by z-depth for proper rendering order

      const sortedIcons = [...iconPositions].sort((a, b) => {

        const cosX = Math.cos(rotationRef.current.x);

        const sinX = Math.sin(rotationRef.current.x);

        const cosY = Math.cos(rotationRef.current.y);

        const sinY = Math.sin(rotationRef.current.y);



        const aRotatedZ = a.x * sinY + a.z * cosY;

        const aFinalZ = a.y * sinX + (a.x * cosY - a.z * sinY) * cosX;

        

        const bRotatedZ = b.x * sinY + b.z * cosY;

        const bFinalZ = b.y * sinX + (b.x * cosY - b.z * sinY) * cosX;



        return aFinalZ - bFinalZ; // Render back to front

      });



      sortedIcons.forEach((icon, index) => {

        const cosX = Math.cos(rotationRef.current.x);

        const sinX = Math.sin(rotationRef.current.x);

        const cosY = Math.cos(rotationRef.current.y);

        const sinY = Math.sin(rotationRef.current.y);



        // 3D rotation transformations

        const rotatedX = icon.x * cosY - icon.z * sinY;

        const rotatedZ = icon.x * sinY + icon.z * cosY;

        const rotatedY = icon.y * cosX + rotatedZ * sinX;

        const finalZ = icon.y * sinX + rotatedZ * cosX;



        // Perspective projection

        const scale = Math.max(0.3, Math.min(1.2, (finalZ + 200) / 300));

        const opacity = Math.max(0.2, Math.min(1, (finalZ + 150) / 200));



        ctx.save();

        ctx.translate(

          canvas.width / 2 + rotatedX,

          canvas.height / 2 + rotatedY,

        );

        ctx.scale(scale, scale);

        ctx.globalAlpha = opacity;



        // Render icon if loaded

        if (iconCanvasesRef.current[icon.id] && imagesLoadedRef.current[icon.id]) {

          ctx.drawImage(iconCanvasesRef.current[icon.id], -20, -20, 40, 40);

        }



        ctx.restore();

      });



      animationFrameRef.current = requestAnimationFrame(animate);

    };



    animate();



    return () => {

      if (animationFrameRef.current) {

        cancelAnimationFrame(animationFrameRef.current);

      }

    };

  }, [iconPositions, isDragging, mousePos, images]);



  return (

    <canvas

      ref={canvasRef}

      width={500}

      height={500}

      onMouseDown={handleMouseDown}

      onMouseMove={handleMouseMove}

      onMouseUp={handleMouseUp}

      onMouseLeave={handleMouseUp}

      className="rounded-lg cursor-grab active:cursor-grabbing"

      aria-label="Interactive 3D Icon Cloud"

      role="img"

    />

  );

};



// IconCloudDemo Component

const IconCloudDemo = () => {

  const slugs = [

    "github",

    "figma", 

    "reddit",

    "linkedin",

    "openai",

    "gmail",

    "notion",

    "x",

    "slack",

    "googlecalendar",

    "telegram",

    "googledrive",

    "googlesheets",

    "discord",

    "trello",

  ];



  const images = slugs.map((slug) => `https://cdn.simpleicons.org/${slug}/${slug}.svg`);



  return (

    <div className="relative flex size-full items-center justify-center overflow-hidden h-[500px]">

      <IconCloud images={images} />

    </div>

  );

};

const LandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const get3DTransform = (intensity: number = 1) => {
    if (typeof window === 'undefined') return 'none';
    
    const x = (mousePosition.x / window.innerWidth - 0.5) * intensity * 20;
    const y = (mousePosition.y / window.innerHeight - 0.5) * intensity * 20;
    return `perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg)`;
  };

  const features = [
    {
      icon: Workflow,
      title: "Visual Workflow Builder",
      description: "Create complex automations with our intuitive drag-and-drop interface. No coding required.",
      color: "from-pink-400 to-rose-400"
    },
    {
      icon: Sparkles,
      title: "1000+ Integrations",
      description: "Connect all your favorite tools and services with pre-built connectors and APIs.",
      color: "from-purple-400 to-indigo-400"
    },
    {
      icon: Bot,
      title: "AI-Powered Automation",
      description: "Smart triggers and actions that learn from your patterns and optimize workflows.",
      color: "from-blue-400 to-cyan-400"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and compliance with SOC2, GDPR, and HIPAA standards.",
      color: "from-green-400 to-emerald-400"
    }
  ];

  const integrations = [
    { name: "Slack", icon: "💬", color: "bg-purple-100" },
    { name: "Google Drive", icon: "📂", color: "bg-blue-100" },
    { name: "Notion", icon: "📝", color: "bg-gray-100" },
    { name: "Salesforce", icon: "⚡", color: "bg-indigo-100" },
    { name: "Shopify", icon: "🛍️", color: "bg-green-100" },
    { name: "GitHub", icon: "🐱", color: "bg-gray-100" },
    { name: "Airtable", icon: "📊", color: "bg-orange-100" },
    { name: "Discord", icon: "🎮", color: "bg-purple-100" },
    { name: "Stripe", icon: "💳", color: "bg-blue-100" },
    { name: "Zoom", icon: "🎥", color: "bg-blue-100" },
    { name: "Mailchimp", icon: "📧", color: "bg-yellow-100" },
    { name: "Trello", icon: "📋", color: "bg-blue-100" }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Product Manager at TechFlow",
      avatar: "👩‍💼",
      content: "Autofy transformed our workflow efficiency by 300%. The visual builder is incredibly intuitive and powerful.",
      rating: 5,
      company: "TechFlow"
    },
    {
      name: "Marcus Johnson",
      role: "Operations Director",
      avatar: "👨‍💼",
      content: "Best automation platform we've used. Setup was seamless and the integrations work flawlessly.",
      rating: 5,
      company: "InnovateCorp"
    },
    {
      name: "Elena Rodriguez",
      role: "Marketing Lead",
      avatar: "👩‍🚀",
      content: "Saved us 25+ hours weekly on repetitive tasks. The AI suggestions are spot-on every time.",
      rating: 5,
      company: "GrowthLab"
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden relative">
      {/* Floating 3D Elements */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <div 
          className="absolute top-20 left-20 w-16 h-16 opacity-20"
          style={{ transform: get3DTransform(0.5) }}
        >
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
        </div>
        <div 
          className="absolute top-40 right-32 w-12 h-12 opacity-20"
          style={{ transform: get3DTransform(-0.3) }}
        >
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>
        <div 
          className="absolute bottom-40 left-32 w-14 h-14 opacity-20"
          style={{ transform: get3DTransform(0.8) }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg flex items-center justify-center">
            <Workflow className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Autofy
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#product" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Product</a>
            <a href="#solutions" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Solutions</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Pricing</a>
            <a href="#docs" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Docs</a>
            <a href="#community" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Community</a>
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              to="/login" 
              className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Background Video - FIXED RESPONSIVE */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="https://pmvzgrlufqgbxgpkaqke.supabase.co/storage/v1/object/public/video/background-video.mp4" type="video/mp4" />
            <div className="w-full h-full bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100"></div>
          </video>
          
          {/* Enhanced Responsive CSS - FIXED STYLES */}
          <style>{`
            @media (max-width: 768px) {
              video {
                object-fit: cover !important;
                height: 100vh !important;
                background: #0f0f1a;
              }
              
              .hero-text {
                left: 0 !important;
                top: -15% !important;
                transform: translateY(-40%) !important;
                text-align: center !important;
                padding: 0 1rem !important;
                max-width: 100% !important;
              }
              
              .hero-text h1 {
                font-size: 2.2rem !important;
                line-height: 1.2 !important;
              }
              
              .hero-text p {
                font-size: 1rem !important;
              }
              
              .hero-buttons {
                flex-direction: column !important;
                gap: 1rem !important;
                align-items: center !important;
                margin-top: 1.5rem !important;
              }
            }
          `}</style>
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30"></div>
        </div>

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

        {/* FIXED HERO TEXT CONTAINER */}
        <div className="relative z-20 px-6 max-w-2xl text-center md:text-left md:max-w-4xl md:-top-16 md:left-[-200px] hero-text">
          <div
            className="transform transition-all duration-1000"
            style={{ transform: get3DTransform(0.1) }}
          >
            <h1 className="text-4xl md:text-7xl font-extrabold leading-tight text-white">
              Automate Tasks{' '}
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Effortlessly
              </span>
            </h1>
            <p className="text-xl md:text-xl text-white/90 mb-6 max-w-2xl leading-relaxed drop-shadow-lg mt-4">
              Transform your workflows with intelligent automation. Connect apps,
              eliminate repetitive tasks, and focus on what truly matters.
            </p>
            
            {/* FIXED BUTTON CONTAINER */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-3 sm:space-y-0 mt-6 hero-buttons">
              <Link
                to="/signup"
                className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span>Get Started Free</span>
                <ArrowRight
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isHovering ? 'translate-x-1' : ''
                  }`}
                />
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/80 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* Features Section with 3D Model */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-50/50 via-transparent to-purple-50/50"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-cyan-200/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 text-gray-900">
              Why Choose{' '}
              <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Autofy?
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful automation features designed for modern teams. Simple to use, impossible to outgrow.
            </p>
          </div>

          {/* Enhanced layout with 3D Model */}
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            {/* Features Grid - Left Side */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="grid md:grid-cols-2 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div 
                      key={index} 
                      className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-gray-200 cursor-pointer backdrop-blur-sm"
                      style={{ 
                        transform: `perspective(1000px) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -5}deg) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 5}deg)`,
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-4 text-gray-900">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3D Model Showcase - Right Side */}
            <div className="lg:col-span-1 flex justify-center order-1 lg:order-2 mb-8 lg:mb-0">
              <div className="relative w-full max-w-md">
                {/* Glowing background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-3xl blur-xl transform scale-110"></div>
                
                {/* 3D Model Container */}
                <div className="relative bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden">
                  <Interactive3DModel 
                    className="w-full h-80 md:h-96 lg:h-[500px]" 
                    modelPath="https://pmvzgrlufqgbxgpkaqke.supabase.co/storage/v1/object/public/model/model.glb"
                  />
                  
                  {/* Overlay content */}
                  <div className="absolute top-6 left-6 right-6">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                        <span className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></span>
                        AI Model Interactive
                      </h3>
                      <p className="text-sm text-gray-600">
                        Experience our AI-powered automation in 3D
                      </p>
                    </div>
                  </div>
                  
                  {/* Bottom stats */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-purple-600">99.9%</div>
                        <div className="text-xs text-gray-600">Uptime</div>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-pink-600">50K+</div>
                        <div className="text-xs text-gray-600">Users</div>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-blue-600">1M+</div>
                        <div className="text-xs text-gray-600">Tasks</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements around the model */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full shadow-lg animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="absolute -top-2 -right-6 w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute -bottom-4 -right-4 w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-lg animate-bounce" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -bottom-2 -left-6 w-7 h-7 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg animate-bounce" style={{ animationDelay: '1.5s' }}></div>
              </div>
            </div>
          </div>
          
          {/* Additional feature highlights */}
          <div className="mt-20 text-center">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group cursor-pointer">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:shadow-xl transition-all duration-300">
                  <div className="text-3xl mb-4">⚡</div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Lightning Fast</h4>
                  <p className="text-gray-600 text-sm">Process millions of tasks with sub-second response times</p>
                </div>
              </div>
              <div className="group cursor-pointer">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:shadow-xl transition-all duration-300">
                  <div className="text-3xl mb-4">🔒</div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Secure by Design</h4>
                  <p className="text-gray-600 text-sm">Enterprise-grade security with end-to-end encryption</p>
                </div>
              </div>
              <div className="group cursor-pointer">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:shadow-xl transition-all duration-300">
                  <div className="text-3xl mb-4">🚀</div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Scale Infinitely</h4>
                  <p className="text-gray-600 text-sm">From startup to enterprise, grow without limits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Showcase */}
      <section className="py-24 px-6 bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-900">Connect Everything</h2>
          <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
            Seamlessly integrate with 1000+ apps and services you already use
          </p>

          <div className="relative overflow-hidden">
            <div className="flex animate-scroll space-x-8 w-max">
              {[...integrations, ...integrations].map((integration, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-24 h-24 ${integration.color} rounded-2xl flex flex-col items-center justify-center group hover:scale-110 transition-transform duration-300 shadow-lg cursor-pointer`}
                >
                  <div className="text-2xl mb-1">{integration.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{integration.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Loved by 50,000+ Teams</h2>
            <p className="text-xl text-gray-600">
              Join thousands of companies automating their workflows with Autofy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group"
                style={{ transform: get3DTransform(0.05) }}
              >
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-gray-500">{testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA with IconCloud */}

<section className="py-24 px-6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300">

  <div className="max-w-7xl mx-auto">

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

      

      {/* Left side - Text content */}

      <div className="text-center lg:text-left">

        <h2

          className="

            text-3xl

            sm:text-4xl

            md:text-5xl

            lg:text-6xl

            xl:text-5xl

            text-gray-900 

            font-bold 

            mb-6

          "

        >

          Ready to Automate?

        </h2>



        <p className="text-base sm:text-lg md:text-xl mb-8 text-gray-700 max-w-2xl mx-auto lg:mx-0">

          Join 50,000+ teams already saving <br />

          time with intelligent automation. <br />

          <span className="font-medium text-purple-600">

            Start free, no credit card required.

          </span>

        </p>



        <Link 

          to="/signup"

          className="inline-flex items-center space-x-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 sm:px-10 py-4 rounded-2xl font-semibold text-lg shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"

        >

          <span>Start Automating Now</span>

          <ArrowRight className="w-6 h-6" />

        </Link>

      </div>

      

      {/* Right side - IconCloud */}

      <div className="flex justify-center lg:justify-end mt-10 lg:mt-0">

        <div className="w-[280px] sm:w-[360px] md:w-[420px] lg:w-[480px]">

          <IconCloudDemo />

        </div>

      </div>

    </div>

  </div>

</section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Autofy</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                The most powerful automation platform for modern teams. Simple, secure, scalable.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-lg">Product</h3>
              <div className="space-y-4">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Features</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Integrations</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Templates</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">API</a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-lg">Company</h3>
              <div className="space-y-4">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">About</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Careers</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Blog</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Press</a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-lg">Support</h3>
              <div className="space-y-4">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Documentation</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Community</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Help Center</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Contact</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">&copy; 2025 Autofy. All rights reserved.</p>
            <div className="flex space-x-8 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
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
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
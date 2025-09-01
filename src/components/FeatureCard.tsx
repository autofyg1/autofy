import React, { useState, useRef, useEffect } from 'react';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: string;
  isVisible?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  delay = '', 
  isVisible = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Add subtle hover animations
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHovered) return;
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    };

    if (isHovered) {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isHovered]);

  return (
    <div 
      ref={cardRef}
      className={`feature-card group p-8 rounded-2xl transition-all duration-500 cursor-pointer transform-gpu ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      } ${delay} hover:bg-white hover:shadow-lg hover:border-gray-200 border border-transparent`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Background gradient that appears on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/0 to-purple-50/0 group-hover:from-violet-50/30 group-hover:to-purple-50/20 rounded-2xl transition-all duration-500"></div>
      
      <div className="relative z-10">
        {/* Icon container with enhanced hover effects */}
        <div className="relative mb-6">
          <div className={`w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-violet-100 group-hover:scale-110 ${
            isHovered ? 'shadow-lg' : ''
          }`}>
            <Icon className="w-6 h-6 text-gray-700 group-hover:text-violet-600 transition-colors duration-300" />
          </div>
          
          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 w-12 h-12 bg-violet-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors duration-300">
          {title}
        </h3>
        
        <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </p>

        {/* Subtle bottom accent line that grows on hover */}
        <div className="mt-6 h-0.5 bg-gradient-to-r from-violet-400 to-purple-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full"></div>
      </div>
    </div>
  );
};

export default FeatureCard;

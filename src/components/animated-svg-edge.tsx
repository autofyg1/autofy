import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from '@xyflow/react';

export interface AnimatedSvgEdge extends EdgeProps {
  data: {
    duration?: number;
    shape?: keyof typeof shapes;
    path?: 'bezier' | 'smoothstep' | 'straight';
  };
}

interface AnimatedSvg {
  (props: { animateMotionProps: any }): JSX.Element;
}

const shapes = {
  package: ({ animateMotionProps }: { animateMotionProps: any }) => (
    <rect width="6" height="6" fill="#3b82f6" rx="1">
      <animateMotion {...animateMotionProps} />
    </rect>
  ),
  circle: ({ animateMotionProps }: { animateMotionProps: any }) => (
    <circle r="3" fill="#10b981">
      <animateMotion {...animateMotionProps} />
    </circle>
  ),
  data: ({ animateMotionProps }: { animateMotionProps: any }) => (
    <circle r="3" fill="#3b82f6" opacity="0.8">
      <animateMotion {...animateMotionProps} />
    </circle>
  ),
  signal: ({ animateMotionProps }: { animateMotionProps: any }) => (
    <rect width="6" height="6" fill="#10b981" rx="1" opacity="0.9">
      <animateMotion {...animateMotionProps} />
    </rect>
  ),
  reddit: ({ animateMotionProps }: { animateMotionProps: any }) => (
    <circle r="4" fill="#ff4500" opacity="0.8">
      <animateMotion {...animateMotionProps} />
    </circle>
  )
} satisfies Record<string, AnimatedSvg>;

export const AnimatedSvgEdge: React.FC<AnimatedSvgEdge> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const { duration = 2, shape = 'package', path = 'smoothstep' } = data;

  let edgePath = '';
  
  switch (path) {
    case 'bezier':
      [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      break;
    case 'straight':
      [edgePath] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
      });
      break;
    case 'smoothstep':
    default:
      [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      break;
  }

  const Shape = shapes[shape];

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <svg>
        <defs>
          <path id={`${id}-path`} d={edgePath} fill="none" />
        </defs>
        <Shape
          animateMotionProps={{
            dur: `${duration}s`,
            repeatCount: 'indefinite',
            children: <mpath href={`#${id}-path`} />,
          }}
        />
      </svg>
    </>
  );
};

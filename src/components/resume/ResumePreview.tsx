import { useRef, forwardRef } from 'react';
import { ResumeData, ResumeConfig, ResumeTemplate } from './types';
import { ModernTemplate } from './templates/ModernTemplate';
import { AcademicTemplate } from './templates/AcademicTemplate';
import { CreativeTemplate } from './templates/CreativeTemplate';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResumePreviewProps {
  data: ResumeData;
  config: ResumeConfig;
}

export const templates: Record<ResumeTemplate, React.ComponentType<{ data: ResumeData; config: ResumeConfig }>> = {
  modern: ModernTemplate,
  academic: AcademicTemplate,
  creative: CreativeTemplate,
};

export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  ({ data, config }, ref) => {
    const Template = templates[config.template] || ModernTemplate;

    return (
      <ScrollArea className="h-full bg-muted/30">
        <div className="p-4 sm:p-6 flex justify-center min-h-full">
          <div 
            ref={ref}
            className="transform-gpu origin-top"
            style={{ 
              transform: 'scale(0.7)',
              transformOrigin: 'top center',
            }}
          >
            <Template data={data} config={config} />
          </div>
        </div>
      </ScrollArea>
    );
  }
);

ResumePreview.displayName = 'ResumePreview';

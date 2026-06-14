import { ResumeData, ResumeConfig } from '../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

interface TemplateProps {
  data: ResumeData;
  config: ResumeConfig;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + '-01');
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function AcademicTemplate({ data, config }: TemplateProps) {
  const { personalInfo, experience, education, skills, projects } = data;

  return (
    <div 
      className="resume-academic bg-white text-gray-900 w-full max-w-[210mm] mx-auto shadow-lg p-8"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      {/* Header - Centered, Traditional */}
      <header className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-3xl font-bold tracking-wide uppercase">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {personalInfo.title && (
          <p className="text-lg italic text-gray-600 mt-1">
            {personalInfo.title}
          </p>
        )}
        
        {/* Contact Info */}
        <div className="flex flex-wrap justify-center items-center gap-4 mt-3 text-sm text-gray-600">
          {personalInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {personalInfo.email}
            </span>
          )}
          {personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              {personalInfo.phone}
            </span>
          )}
          {personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {personalInfo.location}
            </span>
          )}
          {personalInfo.website && (
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {personalInfo.website}
            </span>
          )}
        </div>
      </header>

      <main className="space-y-5">
        {/* Summary */}
        {personalInfo.summary && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-gray-400 pb-1 mb-3">
              Summary
            </h2>
            <p className="text-sm leading-relaxed text-justify">
              {personalInfo.summary}
            </p>
          </section>
        )}

        {/* Education - Prominent for academic CV */}
        {config.sections.education && education.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-gray-400 pb-1 mb-3">
              Education
            </h2>
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id}>
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="font-semibold">{edu.degree}</span>
                      {edu.field && <span className="italic"> in {edu.field}</span>}
                    </div>
                    <span className="text-sm text-gray-600">
                      {formatDate(edu.endDate)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {edu.institution}{edu.location && `, ${edu.location}`}
                  </p>
                  {edu.gpa && (
                    <p className="text-xs text-gray-600 mt-1">GPA: {edu.gpa}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {config.sections.experience && experience.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-gray-400 pb-1 mb-3">
              Professional Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{exp.position}</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(exp.startDate)} – {exp.current ? 'Present' : formatDate(exp.endDate)}
                    </span>
                  </div>
                  <p className="text-sm italic text-gray-700">
                    {exp.company}{exp.location && `, ${exp.location}`}
                  </p>
                  {exp.description && (
                    <div className="mt-2 text-sm text-gray-800 whitespace-pre-line text-justify">
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects / Research */}
        {config.sections.projects && projects.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-gray-400 pb-1 mb-3">
              Research & Projects
            </h2>
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{project.name}</span>
                    {project.url && (
                      <span className="text-xs text-gray-500">— {project.url}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 text-justify mt-1">
                    {project.description}
                  </p>
                  {project.technologies.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="italic">Technologies:</span> {project.technologies.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {config.sections.skills && skills.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-gray-400 pb-1 mb-3">
              Technical Skills
            </h2>
            <div className="text-sm">
              {Object.entries(
                skills.reduce((acc, skill) => {
                  const cat = skill.category || 'General';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(skill.name);
                  return acc;
                }, {} as Record<string, string[]>)
              ).map(([category, skillNames]) => (
                <p key={category} className="mb-1">
                  <span className="font-semibold">{category}:</span>{' '}
                  <span className="text-gray-700">{skillNames.join(', ')}</span>
                </p>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

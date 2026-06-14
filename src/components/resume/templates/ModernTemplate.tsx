import { ResumeData, ResumeConfig } from '../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Calendar } from 'lucide-react';

interface TemplateProps {
  data: ResumeData;
  config: ResumeConfig;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ModernTemplate({ data, config }: TemplateProps) {
  const { personalInfo, experience, education, skills, projects } = data;

  const skillsByCategory = skills.reduce((acc, skill) => {
    const cat = skill.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, typeof skills>);

  return (
    <div 
      className="resume-modern bg-white text-gray-800 w-full max-w-[210mm] mx-auto shadow-lg"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <header 
        className="px-8 py-6"
        style={{ backgroundColor: config.primaryColor }}
      >
        <div className="flex items-start gap-6">
          {config.showPhoto && personalInfo.photo && (
            <img
              src={personalInfo.photo}
              alt={personalInfo.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shrink-0"
            />
          )}
          <div className="flex-1 text-white">
            <h1 className="text-3xl font-bold tracking-tight">
              {personalInfo.fullName || 'Your Name'}
            </h1>
            <p className="text-xl opacity-90 mt-1">
              {personalInfo.title || 'Professional Title'}
            </p>
            
            {/* Contact Row */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm opacity-90">
              {personalInfo.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {personalInfo.email}
                </span>
              )}
              {personalInfo.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  {personalInfo.phone}
                </span>
              )}
              {personalInfo.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {personalInfo.location}
                </span>
              )}
              {personalInfo.website && (
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {personalInfo.website}
                </span>
              )}
              {personalInfo.linkedin && (
                <span className="flex items-center gap-1.5">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </span>
              )}
              {personalInfo.github && (
                <span className="flex items-center gap-1.5">
                  <Github className="w-4 h-4" />
                  GitHub
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-6 space-y-6">
        {/* Summary */}
        {personalInfo.summary && (
          <section>
            <h2 
              className="text-lg font-bold border-b-2 pb-1 mb-3"
              style={{ borderColor: config.primaryColor, color: config.primaryColor }}
            >
              Professional Summary
            </h2>
            <p className="text-sm leading-relaxed text-gray-700">
              {personalInfo.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {config.sections.experience && experience.length > 0 && (
          <section>
            <h2 
              className="text-lg font-bold border-b-2 pb-1 mb-3"
              style={{ borderColor: config.primaryColor, color: config.primaryColor }}
            >
              Work Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                      <p className="text-sm" style={{ color: config.primaryColor }}>
                        {exp.company} {exp.location && `• ${exp.location}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                    </span>
                  </div>
                  {exp.description && (
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {config.sections.education && education.length > 0 && (
          <section>
            <h2 
              className="text-lg font-bold border-b-2 pb-1 mb-3"
              style={{ borderColor: config.primaryColor, color: config.primaryColor }}
            >
              Education
            </h2>
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{edu.degree} in {edu.field}</h3>
                    <p className="text-sm" style={{ color: config.primaryColor }}>
                      {edu.institution} {edu.location && `• ${edu.location}`}
                    </p>
                    {edu.gpa && (
                      <p className="text-xs text-gray-600">GPA: {edu.gpa}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {config.sections.skills && skills.length > 0 && (
          <section>
            <h2 
              className="text-lg font-bold border-b-2 pb-1 mb-3"
              style={{ borderColor: config.primaryColor, color: config.primaryColor }}
            >
              Skills
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {categorySkills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-2 py-1 text-xs rounded-full"
                        style={{ 
                          backgroundColor: `${config.primaryColor}15`,
                          color: config.primaryColor
                        }}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {config.sections.projects && projects.length > 0 && (
          <section>
            <h2 
              className="text-lg font-bold border-b-2 pb-1 mb-3"
              style={{ borderColor: config.primaryColor, color: config.primaryColor }}
            >
              Projects
            </h2>
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    {project.url && (
                      <span className="text-xs text-gray-500">({project.url})</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{project.description}</p>
                  {project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

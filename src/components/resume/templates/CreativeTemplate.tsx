import { ResumeData, ResumeConfig } from '../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Calendar, Star } from 'lucide-react';

interface TemplateProps {
  data: ResumeData;
  config: ResumeConfig;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function SkillLevel({ level }: { level: string }) {
  const levels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  const filled = levels[level as keyof typeof levels] || 2;
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i <= filled ? 'bg-white' : 'bg-white/30'}`}
        />
      ))}
    </div>
  );
}

export function CreativeTemplate({ data, config }: TemplateProps) {
  const { personalInfo, experience, education, skills, projects } = data;

  return (
    <div 
      className="resume-creative bg-white text-gray-800 w-full max-w-[210mm] mx-auto shadow-lg flex min-h-[297mm]"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Sidebar */}
      <aside 
        className="w-1/3 p-6 text-white"
        style={{ backgroundColor: config.primaryColor }}
      >
        {/* Photo */}
        {config.showPhoto && (
          <div className="flex justify-center mb-6">
            {personalInfo.photo ? (
              <img
                src={personalInfo.photo}
                alt={personalInfo.fullName}
                className="w-32 h-32 rounded-full object-cover border-4 border-white/30"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
                {personalInfo.fullName?.charAt(0) || '?'}
              </div>
            )}
          </div>
        )}

        {/* Name & Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            {personalInfo.fullName || 'Your Name'}
          </h1>
          <p className="text-sm opacity-80 mt-1">
            {personalInfo.title || 'Professional Title'}
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">
            Contact
          </h3>
          {personalInfo.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 opacity-70" />
              <span className="break-all text-xs">{personalInfo.email}</span>
            </div>
          )}
          {personalInfo.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 opacity-70" />
              <span className="text-xs">{personalInfo.phone}</span>
            </div>
          )}
          {personalInfo.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 opacity-70" />
              <span className="text-xs">{personalInfo.location}</span>
            </div>
          )}
          {personalInfo.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 opacity-70" />
              <span className="break-all text-xs">{personalInfo.website}</span>
            </div>
          )}
          {personalInfo.linkedin && (
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="w-4 h-4 opacity-70" />
              <span className="text-xs">LinkedIn</span>
            </div>
          )}
          {personalInfo.github && (
            <div className="flex items-center gap-2 text-sm">
              <Github className="w-4 h-4 opacity-70" />
              <span className="text-xs">GitHub</span>
            </div>
          )}
        </div>

        {/* Skills with Levels */}
        {config.sections.skills && skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">
              Skills
            </h3>
            <div className="space-y-2">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between text-sm">
                  <span className="text-xs">{skill.name}</span>
                  <SkillLevel level={skill.level} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {config.sections.education && education.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">
              Education
            </h3>
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id} className="text-xs">
                  <p className="font-semibold">{edu.degree}</p>
                  <p className="opacity-80">{edu.institution}</p>
                  <p className="opacity-60">{formatDate(edu.endDate)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Summary */}
        {personalInfo.summary && (
          <section className="mb-6">
            <h2 
              className="text-lg font-bold mb-3 flex items-center gap-2"
              style={{ color: config.primaryColor }}
            >
              <Star className="w-5 h-5" />
              About Me
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              {personalInfo.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {config.sections.experience && experience.length > 0 && (
          <section className="mb-6">
            <h2 
              className="text-lg font-bold mb-4"
              style={{ color: config.primaryColor }}
            >
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id} className="relative pl-4 border-l-2" style={{ borderColor: config.primaryColor }}>
                  <div 
                    className="absolute -left-1.5 top-1 w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.primaryColor }}
                  />
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                      <p className="text-sm" style={{ color: config.primaryColor }}>
                        {exp.company}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">
                      {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {config.sections.projects && projects.length > 0 && (
          <section>
            <h2 
              className="text-lg font-bold mb-4"
              style={{ color: config.primaryColor }}
            >
              Projects
            </h2>
            <div className="grid gap-4">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="p-4 rounded-lg border"
                  style={{ borderColor: `${config.primaryColor}30` }}
                >
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  {project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ 
                            backgroundColor: `${config.primaryColor}15`,
                            color: config.primaryColor
                          }}
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

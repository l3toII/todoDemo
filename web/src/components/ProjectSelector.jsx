import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import {
  selectActiveProjects,
  selectProjectsLoading,
} from '../features/projects/projectsSlice';

/**
 * ProjectSelector - Dropdown component for selecting an active project
 *
 * Used in ClarifyWizard to assign a task to an existing project.
 */
const ProjectSelector = ({ onSelect, selectedProjectId, label = 'Add to project', id = 'project-selector' }) => {
  const activeProjects = useSelector(selectActiveProjects);
  const isLoading = useSelector(selectProjectsLoading);

  const handleChange = (e) => {
    const value = e.target.value;
    onSelect(value === '' ? null : value);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">
        Loading projects...
      </div>
    );
  }

  if (activeProjects.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No active projects
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={selectedProjectId || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select a project...</option>
        {activeProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>
    </div>
  );
};

ProjectSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  selectedProjectId: PropTypes.string,
  label: PropTypes.string,
  id: PropTypes.string,
};

export default ProjectSelector;

import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

projects.forEach(project => {
  renderProjects(project, projectsContainer, 'h2');
});

// Update the projects-title with the count of projects
const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `Projects (${projects.length})`;

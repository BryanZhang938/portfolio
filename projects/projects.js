import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let query = '';
let selectedIndex = -1;

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

projects.forEach(project => {
  renderProjects(project, projectsContainer, 'h2');
});

// Update the projects-title with the count of projects
const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `Projects (${projects.length})`;

function renderPieChart(projectsGiven) {
  // Group projects by year and count them for the pie chart
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  let data = rolledData.map(([year, count]) => ({
    value: count,
    label: year
  }));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let svg = d3.select('#projects-pie-plot');
  let legend = d3.select('.legend');

  // Clear previous paths and legend items
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  // Draw pie chart
  arcData.forEach((d, idx) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(idx))
      .attr('class', idx === selectedIndex ? 'selected' : null)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        // Update classes for all paths and legend items
        svg.selectAll('path')
          .attr('class', (_, i) => i === selectedIndex ? 'selected' : null);
        legend.selectAll('li')
          .attr('class', (d, i) => 'legend-item' + (i === selectedIndex ? ' selected' : ''));
        // Filter projects by selected year
        if (selectedIndex === -1) {
          projectsContainer.innerHTML = '';
          projectsGiven.forEach(project => {
            renderProjects(project, projectsContainer, 'h2');
          });
          projectsTitle.textContent = `Projects (${projectsGiven.length})`;
        } else {
          let selectedYear = data[selectedIndex].label;
          let yearProjects = projectsGiven.filter(p => String(p.year) === String(selectedYear));
          projectsContainer.innerHTML = '';
          yearProjects.forEach(project => {
            renderProjects(project, projectsContainer, 'h2');
          });
          projectsTitle.textContent = `Projects (${yearProjects.length})`;
        }
      });
  });

  // Draw legend
  data.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', 'legend-item' + (idx === selectedIndex ? ' selected' : ''))
      .html(`<span class=\"swatch\"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        svg.selectAll('path')
          .attr('class', (_, i) => i === selectedIndex ? 'selected' : null);
        legend.selectAll('li')
          .attr('class', (d, i) => 'legend-item' + (i === selectedIndex ? ' selected' : ''));
        // Filter projects by selected year
        if (selectedIndex === -1) {
          projectsContainer.innerHTML = '';
          projectsGiven.forEach(project => {
            renderProjects(project, projectsContainer, 'h2');
          });
          projectsTitle.textContent = `Projects (${projectsGiven.length})`;
        } else {
          let selectedYear = data[selectedIndex].label;
          let yearProjects = projectsGiven.filter(p => String(p.year) === String(selectedYear));
          projectsContainer.innerHTML = '';
          yearProjects.forEach(project => {
            renderProjects(project, projectsContainer, 'h2');
          });
          projectsTitle.textContent = `Projects (${yearProjects.length})`;
        }
      });
  });

  // Initial render of projects (if nothing is selected)
  if (selectedIndex === -1) {
    projectsContainer.innerHTML = '';
    projectsGiven.forEach(project => {
      renderProjects(project, projectsContainer, 'h2');
    });
    projectsTitle.textContent = `Projects (${projectsGiven.length})`;
  } else {
    let selectedYear = data[selectedIndex].label;
    let yearProjects = projectsGiven.filter(p => String(p.year) === String(selectedYear));
    projectsContainer.innerHTML = '';
    yearProjects.forEach(project => {
      renderProjects(project, projectsContainer, 'h2');
    });
    projectsTitle.textContent = `Projects (${yearProjects.length})`;
  }
}

// Initial render
renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  // update query value
  query = event.target.value;

  // filter projects by all metadata, case-insensitive
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  // clear the container
  projectsContainer.innerHTML = '';

  // render the filtered projects
  filteredProjects.forEach(project => {
    renderProjects(project, projectsContainer, 'h2');
  });

  // update the projects-title with the count of filtered projects
  projectsTitle.textContent = `Projects (${filteredProjects.length})`;

  // re-render pie chart and legend for filtered projects
  renderPieChart(filteredProjects);
});

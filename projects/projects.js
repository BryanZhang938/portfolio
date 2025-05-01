import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let query = '';
let selectedIndex = -1;

const allProjects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

function getFilteredProjects() {
  let filtered = allProjects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  if (selectedIndex !== -1) {
    let rolledData = d3.rollups(
      filtered,
      (v) => v.length,
      (d) => d.year,
    );
    let data = rolledData.map(([year, count]) => ({ value: count, label: year }));
    if (data[selectedIndex]) {
      let selectedYear = data[selectedIndex].label;
      filtered = filtered.filter(p => String(p.year) === String(selectedYear));
    }
  }
  return filtered;
}

function renderPieChart(projectsGiven) {
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

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  arcData.forEach((d, idx) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(idx))
      .attr('class', idx === selectedIndex ? 'selected' : null)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        svg.selectAll('path')
          .attr('class', (_, i) => i === selectedIndex ? 'selected' : null);
        legend.selectAll('li')
          .attr('class', (d, i) => 'legend-item' + (i === selectedIndex ? ' selected' : ''));
        
        // Renders Projects with both filters
        const filteredProjects = getFilteredProjects();
        projectsContainer.innerHTML = '';
        filteredProjects.forEach(project => {
          renderProjects(project, projectsContainer, 'h2');
        });
        projectsTitle.textContent = `Projects (${filteredProjects.length})`;
        // Renders only search filter
        renderPieChart(
          allProjects.filter((project) => {
            let values = Object.values(project).join('\n').toLowerCase();
            return values.includes(query.toLowerCase());
          })
        );
      });
  });

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
        // Renders projects with both filters
        const filteredProjects = getFilteredProjects();
        projectsContainer.innerHTML = '';
        filteredProjects.forEach(project => {
          renderProjects(project, projectsContainer, 'h2');
        });
        projectsTitle.textContent = `Projects (${filteredProjects.length})`;
        // Renders projects only search filter
        renderPieChart(
          allProjects.filter((project) => {
            let values = Object.values(project).join('\n').toLowerCase();
            return values.includes(query.toLowerCase());
          })
        );
      });
  });
}

// Initial render
renderPieChart(allProjects);

// Initial render of all projects and count
const filteredProjects = getFilteredProjects();
projectsContainer.innerHTML = '';
filteredProjects.forEach(project => {
  renderProjects(project, projectsContainer, 'h2');
});
projectsTitle.textContent = `Projects (${filteredProjects.length})`;

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  selectedIndex = -1;

  const filteredProjects = getFilteredProjects();

  projectsContainer.innerHTML = '';
  filteredProjects.forEach(project => {
    renderProjects(project, projectsContainer, 'h2');
  });
  projectsTitle.textContent = `Projects (${filteredProjects.length})`;
  
  renderPieChart(
    allProjects.filter((project) => {
      let values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query.toLowerCase());
    })
  );
});

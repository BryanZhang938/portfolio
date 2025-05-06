import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: false,
        writable: false,
        enumerable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // Add maximum file length (in lines)
  const maxFileLength = d3.max(data, (d) => d.line);
  dl.append('dt').text('Max file length (lines)');
  dl.append('dd').text(maxFileLength);

  // Add average line length (in characters)
  const avgLineLength = d3.mean(data, (d) => d.length);
  dl.append('dt').text('Avg line length (chars)');
  dl.append('dd').text(avgLineLength.toFixed(2));

  // Add time of day most work is done
  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
  dl.append('dt').text('Most work done (time of day)');
  dl.append('dd').text(maxPeriod);
}

function renderTooltipContent(commit) {
  const tooltip = document.getElementById('commit-tooltip');
  if (Object.keys(commit).length === 0) {
    tooltip.style.display = 'none';
    return;
  }

  tooltip.style.display = 'block';

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleDateString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    timeStyle: 'short',
  });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`; // Offset by 10px for better visibility
  tooltip.style.top = `${event.clientY + 10}px`;
}

function renderScatterPlot(data, commits) {
  // Define dimensions
  const width = 1000;
  const height = 600;

  // Define margins
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  // Define usable area
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Create the SVG element
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Create scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Call the brush selector with scales
  createBrushSelector(svg, xScale, yScale);

  // Calculate the range of edited lines
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  // Create a radius scale
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  gridlines
    .selectAll('line')
    .attr('stroke', (d) => (d < 6 || d >= 18 ? 'steelblue' : 'orange'));

  // Sort commits by total lines in descending order
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Draw scatterplot dots
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(sortedCommits) // Use sortedCommits instead of commits
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines)) // Use the radius scale
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event); // Update position as the mouse moves
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
      updateTooltipVisibility(false);
    });

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // Add Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
}

function createBrushSelector(svg, xScale, yScale) {
  // Define the extent of the brush to match the usable area
  const brush = d3.brush()
    .extent([
      [xScale.range()[0], yScale.range()[1]], // Top-left corner
      [xScale.range()[1], yScale.range()[0]], // Bottom-right corner
    ])
    .on('start brush end', (event) => brushed(event, xScale, yScale));

  // Append the brush to the SVG
  svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  // Raise dots and everything after the overlay
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event, xScale, yScale) {
  const selection = event.selection;

  // Update selected circles
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d, xScale, yScale)
  );

  // Update the selection count
  renderSelectionCount(selection, commits, xScale, yScale);

  // Update the language breakdown
  renderLanguageBreakdown(selection, commits, xScale, yScale);
}

function isCommitSelected(selection, commit, xScale, yScale) {
  if (!selection) {
    return false;
  }

  const [[x0, y0], [x1, y1]] = selection; // Top-left and bottom-right corners
  const cx = xScale(commit.datetime); // X coordinate of the commit
  const cy = yScale(commit.hourFrac); // Y coordinate of the commit

  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1; // Check if within bounds
}

function renderSelectionCount(selection, commits, xScale, yScale) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d, xScale, yScale))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection, commits, xScale, yScale) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d, xScale, yScale))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

let data = await loadData();
let commits = processCommits(data);

console.log(commits);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
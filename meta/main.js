import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('./loc.csv', (row) => ({
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

function updateScatterPlot(data, commits) {
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

  // Clear existing SVG
  d3.select('#chart').selectAll('svg').remove();

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
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('--r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
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

function renderFileSizesChart(files, currentFile = null) {
  // Define dimensions
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 30, left: 40 };

  // Clear existing SVG
  d3.select('#files-chart').selectAll('svg').remove();

  // Create SVG
  const svg = d3.select('#files-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Process data to get cumulative lines over time
  const totalLinesByCommit = d3.rollup(
    commits,
    commitGroup => {
      const totalLines = commitGroup.reduce((sum, commit) => sum + commit.totalLines, 0);
      return {
        datetime: commitGroup[0].datetime,
        totalLines
      };
    },
    d => d.datetime.getTime() // Group by timestamp to ensure unique commits
  );

  const totalLinesData = Array.from(totalLinesByCommit.values())
    .sort((a, b) => a.datetime - b.datetime);

  // Make the data cumulative
  let cumulativeTotal = 0;
  const cumulativeData = totalLinesData.map(d => {
    cumulativeTotal += d.totalLines;
    return {
      datetime: d.datetime,
      totalLines: cumulativeTotal
    };
  });

  // Create scales
  const xScale = d3.scaleTime()
    .domain(d3.extent(cumulativeData, d => d.datetime))
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(cumulativeData, d => d.totalLines)])
    .range([height - margin.bottom, margin.top])
    .nice();

  // Create line generator
  const line = d3.line()
    .x(d => xScale(d.datetime))
    .y(d => yScale(d.totalLines))
    .curve(d3.curveMonotoneX);

  // Add X axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale));

  // Add Y axis
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale));

  // Add the line
  svg.append('path')
    .datum(cumulativeData)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Add dots
  svg.selectAll('circle')
    .data(cumulativeData)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.totalLines))
    .attr('r', 4)
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5)
    .style('transition', 'all 0.3s ease');

  // Add time indicator line if we have a current file
  if (currentFile) {
    // Find the closest commit date in our cumulative data
    const currentTime = currentFile.lastCommit.getTime();
    const closestCommit = cumulativeData.reduce((closest, current) => {
      const currentDiff = Math.abs(current.datetime.getTime() - currentTime);
      const closestDiff = Math.abs(closest.datetime.getTime() - currentTime);
      return currentDiff < closestDiff ? current : closest;
    });

    const timeLine = svg.append('line')
      .attr('x1', xScale(closestCommit.datetime))
      .attr('x2', xScale(closestCommit.datetime))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#ff6b6b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .style('transition', 'all 0.3s ease');

    // Add a dot at the intersection
    svg.append('circle')
      .attr('cx', xScale(closestCommit.datetime))
      .attr('cy', yScale(closestCommit.totalLines))
      .attr('r', 8)
      .attr('fill', '#ff6b6b')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('transition', 'all 0.3s ease');
  }

  // Add title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', margin.top - 10)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text('Cumulative Lines of Code Over Time');
}

let data = await loadData();
let commits = processCommits(data);
let filteredCommits = [...commits];

// Scrollytelling variables
let NUM_ITEMS = commits.length;
let ITEM_HEIGHT = 120;
let VISIBLE_COUNT = 10;
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');

// Files scrollytelling variables
let filesScrollContainer = d3.select('#files-scroll-container');
let filesSpacer = d3.select('#files-spacer');
let filesItemsContainer = d3.select('#files-items-container');

function displayCommitFiles(commits) {
  const lines = commits.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });
  files = d3.sort(files, (d) => -d.lines.length);
  d3.select('.files').selectAll('div').remove();
  let filesContainer = d3
    .select('.files')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div');
  filesContainer
    .append('dt')
    .html(
      (d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`,
    );
  filesContainer
    .append('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', (d) => fileTypeColors(d.type));
}

function renderItems(startIndex) {
  // Clear things off
  itemsContainer.selectAll('div').remove();
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let newCommitSlice = commits.slice(startIndex, endIndex);
  
  // Update the scatterplot with the new slice
  updateScatterPlot(data, newCommitSlice);
  
  // Update the commit files display
  displayCommitFiles(newCommitSlice);
  
  // Re-bind the commit data to the container
  itemsContainer
    .selectAll('div')
    .data(newCommitSlice)
    .enter()
    .append('div')
    .attr('class', 'item')
    .html((commit, index) => `
      <p>
        On ${commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})}, I made
        <a href="${commit.url}" target="_blank">
          ${index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
        </a>. I edited ${commit.totalLines} lines across ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. Then I looked over all I had made, and I saw that it was very good.
      </p>
    `)
    .style('position', 'absolute')
    .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);
}

// Add scroll event listener
scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(
    0,
    Math.min(startIndex, commits.length - VISIBLE_COUNT)
  );
  renderItems(startIndex);
});

function renderFilesItems(startIndex) {
  // Clear things off
  filesItemsContainer.selectAll('div').remove();
  
  // Get the current slice of files
  const lines = commits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      // Get the most recent commit date for this file
      const lastCommit = d3.max(lines, d => d.datetime);
      return { name, lines, lastCommit };
    });
  
  // Sort files chronologically by last commit date
  files = d3.sort(files, (a, b) => a.lastCommit - b.lastCommit);
  
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, files.length);
  let newFilesSlice = files.slice(startIndex, endIndex);
  
  // Update the files visualization
  displayCommitFiles(newFilesSlice);
  
  // Update the file sizes chart with the first file in the current slice
  renderFileSizesChart(files, newFilesSlice[0]);
  
  // Re-bind the files data to the container
  filesItemsContainer
    .selectAll('div')
    .data(newFilesSlice)
    .enter()
    .append('div')
    .attr('class', 'files-item')
    .html((file, index) => `
      <p>
        On ${file.lastCommit.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})}, I worked on
        <code>${file.name}</code>. I edited ${file.lines.length} lines across ${d3.rollups(file.lines, D => D.length, d => d.type).length} different technologies. The file was growing steadily, and I was proud of my progress.
      </p>
    `)
    .style('position', 'absolute')
    .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);
}

// Add scroll event listener for files
filesScrollContainer.on('scroll', () => {
  const scrollTop = filesScrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(
    0,
    Math.min(startIndex, commits.length - VISIBLE_COUNT)
  );
  renderFilesItems(startIndex);
});

// Set up files scrollytelling
const filesTotalHeight = (commits.length - 1) * ITEM_HEIGHT;
filesSpacer.style('height', `${filesTotalHeight}px`);

// Initial render
renderCommitInfo(data, commits);
updateScatterPlot(data, commits);
displayCommitFiles(commits);
renderItems(0);
renderFilesItems(0);
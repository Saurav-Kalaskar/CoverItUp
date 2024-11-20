document.getElementById("generate").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  const resumeText = document.getElementById("resumeText").value;
  
  if (!resumeText.trim()) {
    statusDiv.textContent = "Please paste your resume text first.";
    return;
  }

  try {
    statusDiv.textContent = "Getting job description...";
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getJobDescription
    });

    const jobDescription = results[0].result;
    
    if (!jobDescription || jobDescription === "Job description not found.") {
      throw new Error("Could not find job description on the current page. Please make sure you're on a job posting page.");
    }

    statusDiv.textContent = "Found job description. Generating cover letter...";
    console.log('Job Description:', jobDescription);
    
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: "generateCoverLetter",
      jobDescription,
      resumeText
    });

    if (response.error) {
      throw new Error(response.error);
    }

    statusDiv.textContent = "Cover letter generated successfully!";
    
    // Create and download the text file with new name
    const blob = new Blob([response.coverLetter], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Saurav_Kalaskar_Cover_Letter.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Also display in output div
    document.getElementById("output").textContent = response.coverLetter;

  } catch (error) {
    console.error('Error:', error);
    statusDiv.textContent = error.message || "An error occurred while generating the cover letter.";
  }
});

function getJobDescription() {
  try {
    // Get the main job details container
    const mainJobDetails = document.querySelector('.jobDetailsLiner.mainDetails');
    if (!mainJobDetails) return "Job description not found.";

    // Get job title
    const jobTitle = mainJobDetails.querySelector('.jobtitleInJobDetails')?.textContent?.trim() || '';

    // Get job description
    const jobDescriptionElement = mainJobDetails.querySelector('.jobdescriptionInJobDetails');
    const jobDescription = jobDescriptionElement?.textContent?.trim() || '';

    // Get essential duties
    const essentialDuties = Array.from(mainJobDetails.querySelectorAll('.questionClass .question'))
      .find(el => el.textContent.includes('Essential Duties'))
      ?.nextElementSibling?.textContent?.trim() || '';

    // Get minimum qualifications
    const minQualifications = Array.from(mainJobDetails.querySelectorAll('.questionClass .question'))
      .find(el => el.textContent.includes('Minimum Qualifications'))
      ?.nextElementSibling?.textContent?.trim() || '';

    // Get desired qualifications
    const desiredQualifications = Array.from(mainJobDetails.querySelectorAll('.questionClass .question'))
      .find(el => el.textContent.includes('Desired Qualifications'))
      ?.nextElementSibling?.textContent?.trim() || '';

    // Combine all relevant information
    const fullJobDescription = [
      `Job Title: ${jobTitle}`,
      `Job Description: ${jobDescription}`,
      `Essential Duties: ${essentialDuties}`,
      `Minimum Qualifications: ${minQualifications}`,
      `Desired Qualifications: ${desiredQualifications}`
    ].filter(section => section.includes(':')).join('\n\n');

    console.log('Extracted Job Details:', {
      title: jobTitle,
      description: jobDescription,
      duties: essentialDuties,
      minQual: minQualifications,
      desiredQual: desiredQualifications
    });

    return fullJobDescription;

  } catch (error) {
    console.error('Error extracting job description:', error);
    return "Error extracting job description. Please try again.";
  }
}

function debugJobDescription() {
  console.log('=== Debug Information ===');
  
  const mainContent = document.querySelector('main, [role="main"]');
  console.log('Main content area:', mainContent);
  
  const headings = document.querySelectorAll('h1, h2, h3');
  console.log('Headings found:', Array.from(headings).map(h => h.textContent));
  
  const jobDescSection = document.querySelector('.Job\\ Description, [aria-label="Job Description"]');
  console.log('Job Description section:', jobDescSection);
  
  const navElements = document.querySelectorAll('[role="navigation"], nav');
  console.log('Navigation elements:', navElements);
}

function debugJobElements() {
  const mainDetails = document.querySelector('.jobDetailsLiner.mainDetails');
  console.log('Main Details Container:', mainDetails);
  
  const jobTitle = mainDetails?.querySelector('.jobtitleInJobDetails');
  console.log('Job Title Element:', jobTitle?.textContent);
  
  const jobDesc = mainDetails?.querySelector('.jobdescriptionInJobDetails');
  console.log('Job Description Element:', jobDesc?.textContent);
  
  const questions = mainDetails?.querySelectorAll('.questionClass .question');
  console.log('All Question Elements:', Array.from(questions || []).map(q => q.textContent));
}
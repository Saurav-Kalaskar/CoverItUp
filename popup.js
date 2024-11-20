document.getElementById("generate").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  const resumeText = document.getElementById("resumeText").value;
  const generateButton = document.getElementById("generate");
  
  if (!resumeText.trim()) {
    statusDiv.className = "error";
    statusDiv.textContent = "Please paste your resume text first.";
    return;
  }

  try {
    generateButton.disabled = true;
    statusDiv.className = "loading";
    statusDiv.textContent = "Extracting job description from the page...";
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: debugJobElements
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getJobDescription
    });

    const jobDescription = results[0].result;
    console.log('Extracted Job Description:', jobDescription);
    
    if (!jobDescription || jobDescription === "Job description not found.") {
      throw new Error("Could not find job description on the current page. Please make sure you're on a job posting page.");
    }

    statusDiv.textContent = "Found job description. Generating cover letter...";
    console.log('Job Description:', jobDescription);
    
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          action: "generateCoverLetter", 
          jobDescription, 
          resumeText 
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        }
      );
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.coverLetter) {
      const blob = new Blob([response.coverLetter], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      const filename = `Saurav_Kalaskar_Cover_Letter_${date}.txt`;

      await new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error("Failed to download file"));
          } else {
            resolve(downloadId);
          }
        });
      });

      URL.revokeObjectURL(url);
      statusDiv.className = "success";
      statusDiv.textContent = "Cover letter downloaded successfully!";
    }

  } catch (error) {
    console.error("Error:", error);
    statusDiv.className = "error";
    statusDiv.textContent = `Error: ${error.message}`;
  } finally {
    generateButton.disabled = false;
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
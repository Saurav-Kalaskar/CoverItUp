chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateCoverLetter") {
    generateCoverLetter(request.jobDescription, request.resumeText, request.companyInfo)
      .then(text => sendResponse({ coverLetter: text }))
      .catch(error => {
        console.error("Error:", error);
        sendResponse({ error: error.message || "API request failed" });
      });
    return true; // Indicates asynchronous response
  }
});

async function generateCoverLetter(jobDescription, resumeText, companyInfo) {
  try {
    const apiKey = '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';

    // Format the current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Extract key points from job description
    const keyRequirements = jobDescription
      .split(/[.,\n]/)
      .filter(line => 
        line.toLowerCase().includes('require') || 
        line.toLowerCase().includes('skill') || 
        line.toLowerCase().includes('experience')
      )
      .join('\n');

    // Extract relevant skills from resume
    const relevantSkills = resumeText
      .split(/[.,\n]/)
      .filter(line => 
        line.toLowerCase().includes('skill') || 
        line.toLowerCase().includes('developed') || 
        line.toLowerCase().includes('managed')
      )
      .join('\n');

    // Prepare system and user prompts
    const systemPrompt = {
      role: "system",
      content: `You are an AI assistant specialized in crafting compelling, personalized cover letters based on job descriptions and candidate resumes. Your output must:
      1. Start with a date and properly formatted header.
      2. Begin the body with an engaging hook, using humor or technical relevance based on the job description.
      3. Highlight **exactly two** main keywords per paragraph, emphasizing key job-related skills.
      4. Use concise language and metrics where applicable.
      5. End with enthusiasm tailored to the company's mission and role.`
    };

    const userPrompt = {
      role: "user",
      content: `Generate a cover letter using the exact header format below:

${currentDate}

Saurav Sunil Kalaskar
Tempe, AZ, 85288
(602) 399-6425
skalaska@asu.edu

${companyInfo.name || 'Hiring Manager'}
${companyInfo.address || '[Company Address]'}

Dear Hiring Manager,

KEY JOB REQUIREMENTS:
${keyRequirements}

CANDIDATE'S RELEVANT SKILLS:
${relevantSkills}

FULL JOB DESCRIPTION:
${jobDescription}

Requirements:
1. Start with an engaging hook.
2. Emphasize two technical keywords per paragraph.
3. Maintain exact header format.
4. Highlight relevant achievements and metrics.
5. End with enthusiasm for the specific role.`
    };

    const requestBody = {
      model: "gpt-4",
      messages: [systemPrompt, userPrompt],
      temperature: 0.7,
      max_tokens: 1500
    };

    // API Call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer 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`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid API response structure");
    }

    let coverLetter = data.choices[0].message.content;

    // Ensure proper header
    if (!coverLetter.startsWith(currentDate)) {
      coverLetter = `${currentDate}\n\n${coverLetter}`;
    }

    return coverLetter;

  } catch (error) {
    console.error("Error in generateCoverLetter:", error);
    throw new Error(`Failed to generate cover letter: ${error.message}`);
  }
}
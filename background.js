chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateCoverLetter") {
    generateCoverLetter(request.jobDescription, request.resumeText)
      .then(text => {
        sendResponse({ coverLetter: text });
      })
      .catch(error => {
        console.error("Error:", error);
        sendResponse({ error: error.message || "API request failed" });
      });
    return true;
  }
});

async function generateCoverLetter(jobDescription, resumeText) {
  try {
    const apiKey = 'AIzaSyAmVJpCSD4Wo4UnWjAbOyBeOhnhX9VuFqs';
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a complete cover letter based on the following job description and resume. The cover letter should:
              - Include proper header with contact information
              - Have a professional layout with proper spacing
              - Start with an engaging opener
              - Highlight relevant technical skills and experiences
              - Show enthusiasm for the company and role
              - Connect past experiences with job requirements
              
              Job Description:
              ${jobDescription}
              
              Resume:
              ${resumeText}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Invalid API response structure");
    }

    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error("Error in generateCoverLetter:", error);
    throw new Error(`Failed to generate cover letter: ${error.message}`);
  }
}
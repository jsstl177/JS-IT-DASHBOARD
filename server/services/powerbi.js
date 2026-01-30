// Power BI integration - for now, just return the embed URL
// In a real implementation, this would handle authentication and token generation

function getPowerBIEmbedInfo(embedUrl) {
  try {
    // Extract report ID from URL
    const urlMatch = embedUrl.match(/reports\/([a-f0-9\-]+)/i);
    const reportId = urlMatch ? urlMatch[1] : null;

    return {
      embedUrl: embedUrl,
      reportId: reportId,
      // In production, you would generate access tokens here
      accessToken: null // Placeholder
    };
  } catch (error) {
    console.error('Power BI URL parsing error:', error.message);
    return null;
  }
}

module.exports = { getPowerBIEmbedInfo };
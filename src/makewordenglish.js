const URL = `https://translation.googleapis.com/v3/projects/magicmirror-282201/locations/global:romanizeText`;

export async function getTransliterate(text, accessToken) {
    
    const request = {
        "source_language_code": "auto",
        'contents': text
    };

    const result = await fetch(URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-user-project': 'magicmirror-282201',
            'accept': 'application/json',
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(request)
    });

    const content = await result.json();
    console.log(content);
    return content;
}


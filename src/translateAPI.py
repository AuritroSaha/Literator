from google.cloud import translate_v3 as translate
from google.oauth2 import service_account

# Load your service account credentials
credentials = service_account.Credentials.from_service_account_file("translate.json")

# Initialize the Translation client with the credentials
client = translate.TranslationServiceClient(credentials=credentials)

# Define the project ID and location
project_id = "magicmirror-282201"
location = "global"  # Or any other location based on your project settings
parent = f"projects/{project_id}/locations/{location}"


def batch_transliterate(texts, source_language_code):
    # Prepare the request with the batch of texts
    request = {
        "parent": parent,
        "contents": texts,
        "mime_type": "text/plain",  # Plain text
        "source_language_code": source_language_code,  # The language of input text
        "target_language_code": "en",  # Assuming 'en' for Romanized transliterations
        "model": "base",  # Use "nmt" for Neural Machine Translation if supported, or "base"
    }

    # Call the API
    response = client.translate_text(request=request)

    transliterations = []
    for translation in response.translations:
        # Extract the transliteration (if available)
        if translation.detected_language_code != "en" and translation.transliterations:
            transliterations.append(translation.transliterations.transliterated_text)
        else:
            transliterations.append(translation.translated_text)  # Fallback to translation

    return transliterations


def read_input_file(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        # Read each line and strip extra whitespace/newlines
        return [line.strip() for line in f.readlines()]


def write_output_file(output_file, transliterations):
    with open(output_file, 'w', encoding='utf-8') as f:
        for transliteration in transliterations:
            f.write(transliteration + '\n')


# Example usage: read input from 'input.txt' and write output to 'output.txt'
input_file = 'input.txt'
output_file = 'output.txt'

# Read the input text from the file
input_texts = read_input_file(input_file)

# Specify the source language or use "auto" to detect
source_language_code = "auto"  # Auto-detect the language of the input text

# Get the transliterations from the API
transliterations = batch_transliterate(input_texts, source_language_code)

# Write the transliterated output to the file
write_output_file(output_file, transliterations)

print(f"Transliterated text has been written to {output_file}.")
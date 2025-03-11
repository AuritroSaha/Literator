import com.ibm.icu.text.Transliterator;

public class TransliteratorExample {

    public static void main(String[] args) {
        // Create a transliterator object (e.g., Latin to Cyrillic)
        Transliterator transliterator = Transliterator.getInstance("Latin-Cyrillic");

        // Text to transliterate
        String originalText = "Hello, how are you?";
        
        // Transliterate the text
        String transliteratedText = transliterator.transliterate(originalText);

        // Print the original and transliterated text
        System.out.println("Original Text: " + originalText);
        System.out.println("Transliterated Text: " + transliteratedText);
    }
}

import java.lang.InterruptedException;
import java.io.IOException;
import java.io.File;
import java.util.List;
import java.util.HashMap;

// https://pdfbox.apache.org/docs/2.0.12/javadocs
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.multipdf.Splitter;
import org.apache.pdfbox.multipdf.Overlay;

public class overlay {
	public static void main(String[] args) throws IOException, InterruptedException {
		String project_root = System.getProperty("user.dir"); // where the app is started from; NOT where the controller file is and NOT where this file is
		// System.out.println(project_root);

		String file_name = args[0];
		// System.out.println(file_name);

		// load dark mode transformed pdf
		File file = new File(project_root + "/data/" + file_name + "_temp.pdf");
		PDDocument transformed_pdf = PDDocument.load(file);

		// load original pdf to be the background overlay
		file = new File(project_root + "/data/" + file_name + "_in.pdf");
		PDDocument original_pdf = PDDocument.load(file);

		// split each pdf into its own list of PDDocument
		Splitter splitter = new Splitter();
		List<PDDocument> split_t = splitter.split(transformed_pdf);
		List<PDDocument> split_o = splitter.split(original_pdf);

		// get pagecount (count should be same for transformed and original)
		int pagecount = split_t.size();
		if (split_t.size() != split_o.size()) {
			System.out.println("warning: pdfs have different pagecounts");
			Thread.sleep(100); // sleep for 100ms. need these small time delays after each print because of issue with spawn grouping the print outputs without the delays
		}

		// apply background overlay pages to dark mode transformed pdf pages, then append the aggregate pages to a final pdf
		PDDocument final_pdf = new PDDocument();
		System.out.println("applying background overlay");
		Thread.sleep(100);
		Overlay overlayer = new Overlay();
		overlayer.setOverlayPosition(Overlay.Position.BACKGROUND);
		int j = 0;
		for (int i = 0; i < pagecount; i++) {
			overlayer.setDefaultOverlayPDF(split_o.get(i));
			overlayer.setInputPDF(split_t.get(i));
			PDDocument overlayed_as_doc = overlayer.overlay(new HashMap<Integer, String>());
			PDPage overlayed_page = overlayed_as_doc.getPage(0);
			final_pdf.addPage(overlayed_page);
			j = i+1;
			if (i == 0) {
				System.out.println("done 1 page");
				Thread.sleep(100);
			} else {
				System.out.println("done " + j + " pages");
				Thread.sleep(100);
			}
		}
		System.out.println("overlayed all pages (" + j + ")");
		Thread.sleep(100);

		// save final pdf
		System.out.println("creating output pdf");
		Thread.sleep(100);
		final_pdf.save(project_root + "/data/" + file_name + "_out.pdf");
		System.out.println("created output pdf");
		Thread.sleep(100);

		// close in-memory representations
		overlayer.close();
		original_pdf.close();
		transformed_pdf.close();
		final_pdf.close();
	}
}

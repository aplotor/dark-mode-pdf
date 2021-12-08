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
	static void overlay(List<PDDocument> overlay_pdf, String position, int pagecount, List<PDDocument> base_pdf, PDDocument output_pdf) throws IOException, InterruptedException {
		System.out.println("applying " + position + " overlay");
		Thread.sleep(100); // sleep for 100ms. need these small time delays after each print because of issue with spawn grouping the print outputs without the delays

		Overlay overlayer = new Overlay();
		if (position.equals("background")) {
			overlayer.setOverlayPosition(Overlay.Position.BACKGROUND);
		} else if (position.equals("foreground")) {
			overlayer.setOverlayPosition(Overlay.Position.FOREGROUND);
		}

		int j = 0;
		for (int i = 0; i < pagecount; i++) {
			overlayer.setDefaultOverlayPDF(overlay_pdf.get(i));
			overlayer.setInputPDF(base_pdf.get(i));
			PDDocument overlayed_as_doc = overlayer.overlay(new HashMap<Integer, String>());
			PDPage overlayed_page = overlayed_as_doc.getPage(0);
			output_pdf.addPage(overlayed_page);
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

		overlayer.close();
	}

	public static void main(String[] args) throws IOException, InterruptedException {
		String backend = System.getProperty("user.dir");
		// System.out.println(backend);

		String transform_option = args[0];
		// System.out.println(transform_option);
		String filename = args[1];
		// System.out.println(filename);

		// load original pdf to be the background overlay
		File file = new File(backend + "/tempfiles/" + filename + "_in.pdf");
		PDDocument background_pdf = PDDocument.load(file);

		// load dark mode transformed pdf (will be middle layer)
		file = new File(backend + "/tempfiles/" + filename + "_temp.pdf");
		PDDocument middle_pdf = PDDocument.load(file);

		// load text-stripped pdf to be the foreground overlay
		file = new File(backend + "/tempfiles/" + filename + "_no_text.pdf");
		PDDocument foreground_pdf = PDDocument.load(file);

		// split each pdf into its own list of PDDocument
		Splitter splitter = new Splitter();
		List<PDDocument> split_b = splitter.split(background_pdf);
		List<PDDocument> split_m = splitter.split(middle_pdf);
		List<PDDocument> split_f = splitter.split(foreground_pdf);

		// get pagecount
		int pagecount = split_m.size();
		if (!(split_b.size() == split_m.size() && split_m.size() == split_f.size())) {
			System.err.println("warning: pdfs have different pagecounts");
			Thread.sleep(100);
		}

		// overlay pages to dark mode transformed pdf pages, then append the aggregate pages to a final pdf
		PDDocument out_pdf = new PDDocument();
		overlay(split_b, "background", pagecount, split_m, out_pdf);
		if (transform_option.equals("no_ocr_dark_retain_img_colors")) {
			List<PDDocument> split_o = splitter.split(out_pdf);
			out_pdf = new PDDocument();
			overlay(split_f, "foreground", pagecount, split_o, out_pdf);
		}

		// save final pdf
		System.out.println("creating output pdf");
		Thread.sleep(100);
		out_pdf.save(backend + "/tempfiles/" + filename + "_out.pdf");
		System.out.println("created output pdf");
		Thread.sleep(100);

		// close in-memory representations
		background_pdf.close();
		middle_pdf.close();
		foreground_pdf.close();
		out_pdf.close();
	}
}

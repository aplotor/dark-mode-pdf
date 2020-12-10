import ocrmypdf
import os
import pdf2image
import pdfrw, pdfrw.toreportlab
import PIL.Image, PIL.ImageOps
import reportlab
import sys
import tempfile
import time

project_root = os.getcwd() # where the app is started from; NOT where the controller file is and NOT where this file is
# print(project_root)

file_name = sys.argv[1]
# print(file_name)
# time.sleep(0.1)
option = sys.argv[2]
# print(option)
# time.sleep(0.1)

print("accepting input pdf")
time.sleep(0.1) # need these small time delays after each print because of issue with spawn grouping the print outputs without the delays
inpdf = f"{project_root}/data/{file_name}_in.pdf"
print("accepted input pdf")
time.sleep(0.1)

i = 1

if (option == "dim"):
	read_inpdf = pdfrw.PdfReader(inpdf)
	inpdf_pages = read_inpdf.pages
	inpdf_num_pages = len(read_inpdf.pages)

	# set up input pdf to transfer to reportlab canvas
	print("setting up input pdf to transfer to reportlab canvas")
	time.sleep(0.1)
	inpdf_pages = [pdfrw.buildxobj.pagexobj(page) for page in inpdf_pages[0:inpdf_num_pages]]

	# create reportlab canvas
	print("creating reportlab canvas")
	time.sleep(0.1)
	outpdf = f"{project_root}/data/{file_name}_out.pdf"
	canvas = reportlab.pdfgen.canvas.Canvas(outpdf, pagesize=reportlab.lib.pagesizes.A4)
	canvas.setTitle("")

	# put input pdf pages onto canvas and add a dimmer layer on top of each page
	print("filling canvas and dimming pages")
	time.sleep(0.1)
	for page in inpdf_pages:
		canvas.doForm(pdfrw.toreportlab.makerl(canvas, page))
		canvas.setFillColor(reportlab.lib.colors.Color(0.43, 0.43, 0.43, alpha=0.5))
		canvas.rect(0, 0, 8.26*reportlab.lib.units.inch, 11.69*reportlab.lib.units.inch, fill=1)
		canvas.showPage()
		if (i == 1):
			print("done 1 page")
			time.sleep(0.1)
		else:
			print(f"done {i} pages")
			time.sleep(0.1)
		i += 1

	print(f"done all pages ({i-1})")
	time.sleep(0.1)

	canvas.save()
	print("created output pdf")
	time.sleep(0.1)
else:
	# use hidden temporary directory to hide temp images and intermediary pdf
	# print("creating temporary directory")
	# time.sleep(0.1)
	with tempfile.TemporaryDirectory() as tempdirname:
		# print(f"created temporary directory {tempdirname}")
		# time.sleep(0.1)

		# convert input pdf pages to images
		print("converting pdf pages to dark mode")
		time.sleep(0.1)
		images = pdf2image.convert_from_path(inpdf, dpi=200, output_folder=tempdirname) # pdf -> list of PIL image objects

		# convert images to dark mode
		for image in images:
			image = PIL.ImageOps.grayscale(image)
			image = PIL.ImageOps.invert(image)
			image = PIL.ImageOps.colorize(image, black=(43,43,43), white=(255,255,255))
			image.save(f"{tempdirname}/image{str(i)}.jpg", format="JPEG", progressive=True, optimize=True)
			if (i == 1):
				print("done 1 page")
				time.sleep(0.1)
			else:
				print(f"done {i} pages")
				time.sleep(0.1)
			i += 1
		print(f"done all pages ({i-1})")
		time.sleep(0.1)

		# combine images into pdf
		print("creating pdf from temp pages")
		time.sleep(0.1)
		image1 = PIL.Image.open(f"{tempdirname}/image1.jpg")
		images = []
		for num in range(2, i):
			images.append(PIL.Image.open(f"{tempdirname}/image{str(num)}.jpg"))
		if (option == "no_ocr_dark"):
			image1.save(f"{project_root}/data/{file_name}_out.pdf", format="PDF", append_images=images, save_all=True, title="", resolution=150) # resolution affects page dimensions, not file size
			print("created output pdf")
			time.sleep(0.1)
		elif (option == "ocr_dark"):
			image1.save(f"{tempdirname}/temp.pdf", format="PDF", append_images=images, save_all=True, title="", resolution=250) # resolution affects page dimensions, not file size
			print("created temp pdf")
			time.sleep(0.1)

			# OCR: fork a child process to perform the OCR so that the application will survive if ocrmypdf() fails
			print("forking process to perform OCR")
			time.sleep(0.1)
			pid = os.fork()
			if (pid > 0): # parent process
				# wait for child process to end
				os.waitpid(pid, 0)
				print("child process exited with exit status 0")
				time.sleep(0.1)
			elif (pid == 0): # child process
				# OCR the pdf and create output pdf (PDF/A)
				print("child process performing OCR (this might take a while)")
				time.sleep(0.1)
				ocrmypdf.ocr(f"{tempdirname}/temp.pdf", f"{project_root}/data/{file_name}_out.pdf", force_ocr=True, language="eng")
				print("done OCR")
				time.sleep(0.1)
				print("created output pdf")
				time.sleep(0.1)
				os._exit(0)

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
option = sys.argv[2]
# print(option)

print("\nstart")
time.sleep(2)

i = 1

if (option == "dim"):
	# accepting input pdf
	print("accepting input pdf")
	time.sleep(2) # need these small time delays after each print because of issue with spawn grouping the print outputs without the delays
	inpdf = f"{project_root}/data/{file_name}_in.pdf"
	print("accepted input pdf")
	time.sleep(2)
	read_inpdf = pdfrw.PdfReader(inpdf)
	inpdf_pages = read_inpdf.pages
	inpdf_num_pages = len(read_inpdf.pages)

	# setting up input pdf to transfer to reportlab canvas
	print("setting up input pdf to transfer to reportlab canvas")
	time.sleep(2)
	inpdf_pages = [pdfrw.buildxobj.pagexobj(page) for page in inpdf_pages[0:inpdf_num_pages]]

	# creating reportlab canvas
	print("creating reportlab canvas")
	time.sleep(2)
	outpdf = f"{project_root}/data/{file_name}_out.pdf"
	canvas = reportlab.pdfgen.canvas.Canvas(outpdf, pagesize=reportlab.lib.pagesizes.A4)
	canvas.setTitle("")

	# putting input pdf pages onto canvas and adding a dimmer layer on top of each page
	print("filling canvas and dimming pages")
	time.sleep(2)
	for page in inpdf_pages:
		canvas.doForm(pdfrw.toreportlab.makerl(canvas, page))
		canvas.setFillColor(reportlab.lib.colors.Color(0.43, 0.43, 0.43, alpha=0.5))
		canvas.rect(0, 0, 8.26*reportlab.lib.units.inch, 11.69*reportlab.lib.units.inch, fill=1)
		canvas.showPage()
		if (i == 1):
			print("done 1 page")
			time.sleep(2)
		else:
			print(f"done {i} pages")
			time.sleep(2)
		i += 1

	canvas.save()
	print(f"done all pages ({i-1})")
	time.sleep(2)
else:
	# use hidden temporary directory to hide temp images and intermediary pdf
	print("creating temporary directory")
	time.sleep(2)
	with tempfile.TemporaryDirectory() as tempdirname:
		print(f"created temporary directory {tempdirname}")
		time.sleep(2)

		# accepting input pdf
		print("accepting input pdf")
		time.sleep(2)
		inpdf = f"{project_root}/data/{file_name}_in.pdf"
		print("accepted input pdf")
		time.sleep(2)

		# converting input pdf pages to temp images
		print("converting pdf pages to dark mode")
		time.sleep(2)
		images = pdf2image.convert_from_path(inpdf, dpi=200, output_folder=tempdirname)
		for image in images:
			image = PIL.ImageOps.grayscale(image)
			image = PIL.ImageOps.invert(image)
			image = PIL.ImageOps.colorize(image, black=(43,43,43), white=(255,255,255))
			image.save(f"{tempdirname}/image{str(i)}.jpg")
			if (i == 1):
				print("done 1 page")
				time.sleep(2)
			else:
				print(f"done {i} pages")
				time.sleep(2)
			i += 1
		print(f"done all pages ({i-1})")
		time.sleep(2)

		# creating temp pdf from temp images
		print("creating temp pdf from temp pages")
		time.sleep(2)
		image1 = PIL.Image.open(f"{tempdirname}/image1.jpg")
		images = []
		for num in range(2, i):
			images.append(PIL.Image.open(f"{tempdirname}/image{str(num)}.jpg"))
		image1.save(f"{tempdirname}/temp.pdf", "PDF", resolution=200, save_all=True, append_images=images)
		print("created temp pdf")
		time.sleep(2)

		if (option == "no_ocr_dark"):
			# recreate the pdf without title so that the title will change to match the filename
			print("recreating pdf without title")
			time.sleep(2)
			inpdf = f"{tempdirname}/temp.pdf"
			outpdf = f"{project_root}/data/{file_name}_out.pdf"
			trailer = pdfrw.PdfReader(inpdf)
			trailer.Info.Title = ""
			pdfrw.PdfWriter(outpdf, trailer=trailer).write()
			print("recreated pdf without title")
			time.sleep(2)
		elif (option == "ocr_dark"):
			# recreate the temp pdf without title so that the title will change to match the filename
			print("recreating temp pdf without title")
			time.sleep(2)
			inpdf = f"{tempdirname}/temp.pdf"
			outpdf = f"{tempdirname}/temp2.pdf"
			trailer = pdfrw.PdfReader(inpdf)
			trailer.Info.Title = ""
			pdfrw.PdfWriter(outpdf, trailer=trailer).write()
			print("recreated temp pdf without title")
			time.sleep(2)

			# fork a child process to perform the OCR so that the application will survive even if ocrmypdf() fails due to insufficient privileges
			print("forking process to perform OCR")
			time.sleep(2)
			pid = os.fork()
			if (pid > 0): # parent process
				# wait for child process to end
				os.waitpid(pid, 0)
				print("child process exited with exit status 0")
				time.sleep(2)
			elif (pid == 0): # child process
				# OCR the pdf and create output pdf (PDF/A)
				print("child process performing OCR")
				time.sleep(2)
				ocrmypdf.ocr(f"{tempdirname}/temp2.pdf", f"{project_root}/data/{file_name}_out.pdf", language="eng", force_ocr=True)
				print("done OCR and created output pdf")
				time.sleep(2)
				os._exit(0)

print("end\n")

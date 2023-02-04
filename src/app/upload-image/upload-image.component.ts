import { AnimateTimings } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Component , ViewChild, ElementRef, Renderer2} from '@angular/core';

@Component({
  selector: 'app-upload-image',
  templateUrl: './upload-image.component.html',
  styleUrls: ['./upload-image.component.css']
})

export class UploadImageComponent {

	// Uploaded Image
	url: any; 
	msg = "";
	selectedFile: any
	image : HTMLImageElement | undefined;
	// Canvas and Lines
	canvas: any;
	ctx: any;
	isDrawing: boolean = false;
	startX: number = 0;
	startY: number = 0;
	lines: number[][] = [];
	currLineIndices: number[][] = [];
	lineSeqSum : number = 0;
	// Returned Image
	returnedImage_bytes : any
	imageUrl: any
	scale : any = 1;

	constructor(private http: HttpClient ,private elementRef: ElementRef, private renderer: Renderer2) {}

	// lifecycle hook, which is called after the view has been initialized.
	ngAfterViewInit() {
		this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
		this.ctx = this.canvas.getContext('2d');
	}

	// Triggered as a response to an image upload
	selectFile(event: any) { //Angular 11, for stricter type
		if(!event.target.files[0] || event.target.files[0].length == 0) {
			this.msg = 'You must select an image';
			return;
		}
		
		let file = event.target.files[0].type;
		if (file.match(/image\/*/) == null) {
			this.msg = "Only images are supported";
			return;
		}
		let reader = new FileReader();
		
		this.selectedFile = event.target.files[0];
		this.isDrawing = false;
		this.currLineIndices = [];
		
		// Wait for the image to load
		reader.onload = (_event) => {
			var image = new Image();
  			image.src = URL.createObjectURL(event.target.files[0]);
			this.msg = "";
			this.url = reader.result; 
			image.onload = () => {  // Adjust the canvas size
				this.returnedImage_bytes = this.http.post('http://127.0.0.1:5000/data', this.selectedFile).subscribe();
				this.canvas.width = image.naturalWidth; 
				this.canvas.height = image.naturalHeight;
				if (this.ctx != null) {
					this.ctx.drawImage(image, 0, 0);	
					this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
				}
				this.image = image;  //NEW
			}
		}
		reader.readAsDataURL(event.target.files[0]);  //reads the file as a Data URL and triggers the onload event.
	}


	getData() {
		this.isDrawing = false;
		this.http.post('http://127.0.0.1:5000/indices', this.currLineIndices)  // Sending to server the new indices
		.subscribe(returnedImageData => {
			this.currLineIndices = [];
			console.log(returnedImageData); 
			this.show_new_image(returnedImageData)
		});
	}


	show_new_image(response: { [x: string]: any; } ) {
		const imageBase64 = response['image'];
		const imageBytes = atob(imageBase64);
		const imageArray = new Uint8Array(imageBytes.length);
		for (let i = 0; i < imageBytes.length; i++) {
		  imageArray[i] = imageBytes.charCodeAt(i);
		}

		const imageBlob = new Blob([imageArray], {type: 'image/jpeg'});
		
		var reader = new FileReader();
		reader.readAsDataURL(imageBlob);
		
		reader.onload = (_event) => {
			this.msg = "";
			this.imageUrl = reader.result; 
		}	
	}


	calculateLinePixels(startX: number, startY: number, endX: number, endY: number) {
		const dx = Math.abs(endX - startX);
		const dy = Math.abs(endY - startY);
		const sx = (startX < endX) ? 1 : -1;
		const sy = (startY < endY) ? 1 : -1;
		let err = dx - dy;

		while (true) {
			this.currLineIndices.push([startX, startY]);
			if (startX === endX && startY === endY) {
				break;
			}
			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				startX += sx;
			}
			if (e2 < dx) {
				err += dx;
				startY += sy;
			}
		}
	  }

	drawLine(startX: number, startY: number, endX: number, endY: number) {
		this.ctx.moveTo(startX, startY);
		this.ctx.lineTo(endX, endY);
		this.ctx.stroke();
		this.calculateLinePixels(startX, startY, endX, endY);
		this.lineSeqSum++;
	}

	onMouseDown(event: MouseEvent) {
		const currX = event.offsetX
		const currY = event.offsetY
		if(this.isDrawing) {
			this.drawLine(this.startX, this.startY, currX, currY);
			this.lines.push([this.startX, this.startY, currX, currY]);
		}
		else 
			this.lineSeqSum = 0;   // New
		this.startX = currX;
		this.startY = currY;
		this.isDrawing = true;
	}


	zoomIn() {
		this.scale += 0.1;
	}
	
	zoomOut() {
		this.scale -= 0.1;
	}

	undo(){
		this.http.get('http://127.0.0.1:5000/undo').
		subscribe(returnedImageData => {
			console.log(returnedImageData); 
			this.show_new_image(returnedImageData)
		});
		this.undoCanvas();  // NEW
	}

	undoCanvas() {   // NEW
		this.isDrawing = false;
		console.log('lines length ' + this.lines.length);   //TO DELETE
		for (let i=0; i<this.lineSeqSum; i++) {
			this.lines.pop();
			console.log('pop number ' + i);   //TO DELETE
		}
		for (let i=0; i<this.lines.length; i++) {   //TO DELETE
			console.log(this.lines[i][0], this.lines[i][1], this.lines[i][2], this.lines[i][3]);
		}
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.drawImage(this.image, 0, 0);
		for (let i=0; i<this.lines.length-1; i++) 
			this.drawLine(this.lines[i][0], this.lines[i][1], this.lines[i][2], this.lines[i][3]);
	}

}


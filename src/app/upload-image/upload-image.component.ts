import { AnimateTimings } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Component , ViewChild, ElementRef, Renderer2} from '@angular/core';

@Component({
  selector: 'app-upload-image',
  templateUrl: './upload-image.component.html',
  styleUrls: ['./upload-image.component.css']
})

export class UploadImageComponent {

	url: any; 
	msg = "";
	selectedFile: any

	image: HTMLImageElement = new Image();
	imageStruct = { width: 1, height: 1, data: [[1]] };

	// @ViewChild('myCanvas') canvas: ElementRef<HTMLCanvasElement> = new ElementRef<HTMLCanvasElement>(document.createElement('canvas'));
	// ctx: CanvasRenderingContext2D |null= this.canvas.nativeElement.getContext('2d');
	// canvas = this.elementRef.nativeElement.querySelector('#canvas');
	canvas: any;
	ctx: any;
	isDrawing: boolean = false;
	startX: number = 0;
	startY: number = 0;
	lineIndices: number[][] =[];
	
	returnedImage_bytes : any
	imageUrl: any

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
		this.lineIndices = [];
		
		// Wait for the image to load
		reader.onload = (_event) => {
			var image = new Image();   // MAYA
  			image.src = URL.createObjectURL(event.target.files[0]);   // MAYA
			this.msg = "";
			this.url = reader.result; 
			image.onload = () => {  // Adjust the canvas size
				this.canvas.width = image.naturalWidth;  //TO FIX
				this.canvas.height = image.naturalHeight;
				if (this.ctx != null) {
					this.ctx.drawImage(image, 0, 0);	
					this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
					// this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
					this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
				}
			}
		}
		reader.readAsDataURL(event.target.files[0]);  //reads the file as a Data URL and triggers the onload event.
	}


	getData() {
		this.isDrawing = false;
		this.http.post('http://127.0.0.1:5000/indices', this.lineIndices).subscribe();  // Sending to server the new indices
		this.returnedImage_bytes = this.http.post('http://127.0.0.1:5000/data', this.selectedFile)
		.subscribe(imageData => {
			console.log(imageData); 
			this.show_new_image(imageData)
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


	calculateLinePixels(currX: number, currY: number) {
		const dx = Math.abs(currX - this.startX);
		const dy = Math.abs(currY - this.startY);
		const sx = (this.startX < currX) ? 1 : -1;
		const sy = (this.startY < currY) ? 1 : -1;
		let err = dx - dy;
	
		while (true) {
			this.lineIndices.push([this.startX, this.startY]);
			if (this.startX === currX && this.startY === currY) {
				break;
			}
			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				this.startX += sx;
			}
			if (e2 < dx) {
				err += dx;
				this.startY += sy;
			}
		}
	  }

	onMouseDown(event: MouseEvent) {
		const currX = event.offsetX
		const currY = event.offsetY
		if(this.isDrawing) {
			this.ctx.moveTo(this.startX, this.startY);
		  	this.ctx.lineTo(currX, currY);
			this.ctx.stroke();
			this.calculateLinePixels(currX, currY);
		}
		this.startX = currX;
		this.startY = currY;
		this.isDrawing = true;
	}

	onMouseUp(event: MouseEvent) {
		// this.isDrawing = false;
	}


}








	//NOT USED
	// getImageData(image: File): Promise<{ width: number, height: number, data: number[][] }> {
	// 	return new Promise((resolve, reject) => {
	// 	  let canvas = document.createElement('canvas');
	// 	  let ctx = canvas.getContext('2d');
	// 	  const img = new Image();
	// 	  img.onload = () => {
	// 		if(ctx != null) {
	// 			ctx.drawImage(img, 0, 0);
	// 			const imageData = ctx.getImageData(0, 0, img.width, img.height);
	// 			const data : number[][] = new Array(imageData.height);
	// 			for (let i = 0; i < imageData.height; i++) {
	// 			data[i] = new Array(imageData.width);
	// 				for (let j = 0; j < imageData.width; j++) {
	// 					const index = (i * imageData.width + j) * 4;
	// 					data[i][j] = imageData.data[index];
	// 				}
	// 			}
	// 			this.imageStruct.data = data
	// 			this.imageStruct.height = imageData.height
	// 			this.imageStruct.width = imageData.width

	// 			resolve({
	// 				width: imageData.width,
	// 				height: imageData.height,
	// 				data: data
	// 			});
	// 		}
	// 	  };
	// 	  img.onerror = (error) => {
	// 		reject(error);
	// 	  };
	// 	  img.src = URL.createObjectURL(image);
	// 	});
	// }



	//   onMouseDown(event: MouseEvent) {
	// 	console.log("5")
	// 	this.isDrawing = true;
	// 	this.startX = event.offsetX;
	// 	this.startY = event.offsetY;
	//   }
	
	//   onMouseMove(event: MouseEvent) {
	// 	console.log("6")
	// 	if (!this.isDrawing) {
	// 	  return;
	// 	}
	// 	if (this.ctx !=undefined){
	// 		this.ctx.beginPath();
	// 		this.ctx.moveTo(this.startX, this.startY);
	// 		this.ctx.lineTo(event.offsetX, event.offsetY);
	// 		this.ctx.stroke();
	// 		this.startX = event.offsetX;
	// 		this.startY = event.offsetY;
	// 		this.pixels.push([event.offsetX, event.offsetY]);
	// 	}
		
	//   }
	
	//   onMouseUp(event: MouseEvent) {
	// 	console.log("7")
	// 	this.isDrawing = false
	//   }

// 	  getData2(){
		
// 		const uploadData = new FormData();
// 		uploadData.append('myFile', this.selectedFile, "my_img");
// 		this.http.post('http://127.0.0.1:5000/data', uploadData , { responseType: 'text' })
// 		.subscribe(imageData => {
// 			// Display the image using the <img> element
// 			const imageElement = document.getElementById('image');
			
// 		  },
// 		  error => {
// 			console.log(error);
// 		  });
	

//   }
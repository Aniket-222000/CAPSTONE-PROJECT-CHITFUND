import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
@Component({
  selector: 'app-homescreen',
  imports: [CommonModule,FormsModule],
  templateUrl: './homescreen.component.html',
  styleUrl: './homescreen.component.css'
})
export class HomescreenComponent {
  constructor(private router:Router) {} 
signin() {
this.router.navigate(['/login']);
}
signup() {
this.router.navigate(['/register']);
}

}

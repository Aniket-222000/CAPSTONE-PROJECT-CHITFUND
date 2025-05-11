import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  showRegister: boolean=false;
  constructor(private http: HttpClient,private router:Router) {}
  adminScretKey="admin@123";
  organizerSecretKey="mycompany@123";
 formData={

  userName: '',
  userEmail: '',
  password: '',
  userMobileNum: '',
  userAddress: '',
  userRole: '',
  groupIds:[]
  }; 
confirmPassword: any;
secretkey: any;
showPasswordMismatchModal: boolean=false;
showSecretKey: boolean=false;
closePasswordMismatchModal() {
  this.showPasswordMismatchModal = false;
  }
  closeShowSecretKey() {
    this.showSecretKey=false;
    }
    closeSuccessModal() {
      this.showRegister=false;
      this.router.navigate(['/login']);
      
      }
  onSubmit() {
      if(this.formData.password != this.confirmPassword){
        this.showPasswordMismatchModal=true
        return;
      }
      else if(this.formData.userRole=='admin' && ((this.secretkey!=this.adminScretKey)||(this.secretkey==null))){
        console.log("admin secret key is wrong");
        this.showSecretKey=true;
        console.log(this.showSecretKey);
        return;
      }
      else if(this.formData.userRole=='organizer' && ((this.secretkey!=this.organizerSecretKey)||(this.secretkey==null))){
        console.log("organizer secret key is wrong");
        this.showSecretKey=true;
        console.log(this.showSecretKey);
        return;
      }
      else{
        this.http.post('http://localhost:3000/api/auth/register', this.formData).subscribe({
          next:(response)=>{
            console.log(response);
            this.showRegister=true;
          },
          error: (error) => {
            console.error('Error:', error);
          },
          complete: () => {
            console.log('Request completed.');
          }
        });
      }
    }
}

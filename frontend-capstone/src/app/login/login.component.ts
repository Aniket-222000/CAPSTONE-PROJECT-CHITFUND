import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonEngine } from '@angular/ssr/node';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule,CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

userEmail: string='';
password: string='';
  login: boolean=false;
constructor(private http: HttpClient,private router:Router) {}
onSubmit() {
  this.http.post('http://localhost:3000/api/auth/login',{userEmail:this.userEmail,password:this.password})
  .subscribe({
    next:(response:any)=>{
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token',response.token)
 
      }
      
       this.router.navigate(['/dashboard-user']);
    },
    error: (error) => {
      console.error('Error:', error);
      this.login=true;
      console.log("login",this.login)
    },
    complete: () => {
    
      console.log('Request completed.');
    }
  });
}
closelogin() {
  this.login = false; 
  this.router.navigate(['/login']);
      
}
}

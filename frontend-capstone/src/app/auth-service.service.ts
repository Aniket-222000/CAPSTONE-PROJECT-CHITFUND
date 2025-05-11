import { Injectable } from '@angular/core';
import { JwtPayload } from './participant-dashboard/participant-dashboard.component';
import { jwtDecode } from 'jwt-decode';
@Injectable({
  providedIn: 'root'
})
export class AuthServiceService {

  constructor() { }
  isAuthenticated(): boolean {
    const token=localStorage.getItem('token')
    if(token){
      const decoded=jwtDecode<JwtPayload>(token);
      if(decoded.exp*1000<Date.now()){
        return false;
      }
      else if(decoded.userRole=='organizer'||decoded.userRole=="Admin"){
        return false;
      }
      else{
        return true;
      }
      

    }
    return false;
  }
  approved(token:any){

  }
}

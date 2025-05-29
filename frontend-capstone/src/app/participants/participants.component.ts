import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-participants',
  imports: [CommonModule,FormsModule],
  templateUrl: './participants.component.html',
  styleUrl: './participants.component.css'
})
export class ParticipantsComponent implements OnInit{
info(arg0: any) {
throw new Error('Method not implemented.');
}
log(_t19: any) {
  console.log(_t19);
throw new Error('Method not implemented.');
}
  
  userdetails:{[key:string]:any[]}={};
index: any;
  constructor(private http: HttpClient) { 

  }
  ngOnInit() {
    console.log("insisde participant frameworl")
    this.http.get('http://localhost:3000/api/groups/all').subscribe({
      next:(response:any)=>{
        for(let i=0;i<response.length;i++){
          const groupName=response[i].groupName
          this.http.get(`http://localhost:3003/api/groups/${groupName}/participants`).subscribe({
            next:(response:any)=>{

              console.log(response,"response from groups fetching")
              if(!this.userdetails[groupName]){
                this.userdetails[groupName]=[]
              }
              this.userdetails[groupName].push(response);
            },
            error:(error)=>{
              console.log(error,"error")
            },
            complete:()=>{
              console.log("complete")
            }
          });
        }
      },
      error:(error)=>{
        console.log(error,"error")
      },
      complete:()=>{
        console.log(this.userdetails,"user details")
        console.log("complete")
      }
    })
  }

}

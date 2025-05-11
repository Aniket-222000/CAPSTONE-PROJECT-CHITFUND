import { CommonModule } from '@angular/common';
import { Component, input, OnInit ,Input} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '../participant-dashboard/participant-dashboard.component';
@Component({
  selector: 'app-groups',
  imports: [CommonModule,FormsModule],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.css'
})
export class GroupsComponent implements OnInit {


  @Input()length: any;
  @Input()total: any;
  @Input()totalMembers:any;
  @Input()totalRequests:any;
  groupDetails:any=[];
  token: any;
  organizerId: any;
  removed: boolean=false;
  constructor(private http: HttpClient) { }
  ngOnInit() {
     let token = null;
        if (typeof window !== 'undefined') {
          token = localStorage.getItem('token');
        }
        this.token = token;
        if (token) {
          const decoded = jwtDecode<JwtPayload>(token);
          this.organizerId = decoded.userId;
          console.log(decoded.userRole);
    this.http.get('http://localhost:3000/api/groups/all').subscribe({
      next: (response: any) => {
        console.log(response, "response")
        this.groupDetails = response.filter((group: any) => group.organizerId === this.organizerId);

      },
      error: (error) => {
        console.error('Error:', error);
      },
      complete: () => {
        console.log('Request completed.');
      }
    })
  }

}
removeGroup(groupName: any) {
  this.http.delete(`http://localhost:3000/api/groups/${groupName}`).subscribe({
    next: (response: any) => {
      console.log(response, "response")
      this.groupDetails = this.groupDetails.filter((group: any) => group.groupName !== groupName);
      this.removed=true;
    },
    error: (error) => {
      console.error('Error:', error);
    },
    complete: () => {
      console.log('Request completed.');
    }
  })
  }
  closeSuccessModal() {
    this.removed=false;
    }
}
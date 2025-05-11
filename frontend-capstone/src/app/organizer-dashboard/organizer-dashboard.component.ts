import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '../participant-dashboard/participant-dashboard.component';
import { decode } from 'punycode';
import { ParticipantsComponent } from "../participants/participants.component";
import { GroupsComponent } from "../groups/groups.component";


@Component({
  selector: 'app-organizer-dashboard',
  imports: [CommonModule, FormsModule, ParticipantsComponent, GroupsComponent],
  templateUrl: './organizer-dashboard.component.html',
  styleUrl: './organizer-dashboard.component.css'
})
export class OrganizerDashboardComponent implements OnInit {



  requestgroups: any;
  formData = {
    groupId: '',
    groupName: '',
    interest: '',
    organizerId: '',
    members: '',
    duration: '',
    totalAmount: '',
    ticketValue: '',
    startDate: '',
    endDate: '',
    description: ''

  }
  groupName: any;
  totalRequests:any
  selectedMenu: string = "Dashbaord";
  userId: any;
  request: boolean = false;
  approved: boolean = false;
  organizerId1: any;
  length: any = 0;
  groups: any;
  total: any;
  token: any;
  reject: boolean = false;
  showcreategroupmodal: boolean = false;
  joinRequests: { [key: string]: any[] } = {};
  showParticipants: boolean = false;
  showGroup: boolean = false;
  totalMembers: any;
  constructor(private http: HttpClient) { }
  ngOnInit(): void {
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token');
    }
    this.token = token;
    if (token) {
      const decoded = jwtDecode<JwtPayload>(token);
      this.formData.organizerId = decoded.userId;
      console.log(decoded.userRole);
      this.http.get('http://localhost:3000/api/groups/all').subscribe({
        next: (response: any) => {

          this.groups = response.filter((group: any) => group.organizerId === this.formData.organizerId);
          this.total = this.groups.reduce((acc: any, group: any) => acc + group.totalAmount, 0);
          this.length = this.groups.length;
          this.totalRequests = this.groups.reduce((acc: any, group: any) => acc + group.joinRequests.length, 0);
          this.totalMembers=this.groups.reduce((acc: any, group: any) => acc + group.members, 0);
          console.log(this.totalMembers,"total members");
          this.requestgroups = response.filter((group: any) => group.joinRequests.length > 0);
          console.log(this.requestgroups[0].groupName, "request groups");
          for (let i = 0; i < this.requestgroups.length; i++) {
            for (let j = 0; j < this.requestgroups[i].joinRequests.length; j++) {
              this.http.get(`http://localhost:3000/api/users/${this.requestgroups[i].joinRequests[j]}`)
                .subscribe({
                  next: (response: any) => {
                    console.log(response, "response user")
                    const groupName = this.requestgroups[i].groupName;

                    if (!this.joinRequests[groupName]) {
                      this.joinRequests[groupName] = [];
                    }

                    this.joinRequests[groupName].push(response);

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

          console.log(this.joinRequests, "join requests")

          

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

  showcreategroup: boolean = false;
  createGroup() {
    this.showcreategroup = (!this.showcreategroup)
  }
  onSubmit() {
    const date = Date.now().toString()
    console.log(date);
    this.formData.groupId = this.formData.organizerId + date;
    const endDate:any = new Date(this.formData.startDate);
    endDate.setMonth(endDate.getMonth() + this.formData.duration);
    this.formData.endDate=endDate;
    this.formData.ticketValue=Math.floor(parseInt(this.formData.totalAmount)/parseInt(this.formData.members)).toString();
    console.log(this.formData);
    this.http.post('http://localhost:3000/api/groups', this.formData).subscribe({
      next: (response) => {
        this.showcreategroupmodal = true;
      },
      error: (error) => {
        console.error('Error:', error);
      },
      complete: () => {
        console.log('Request completed.');
      }
    });
  }
  closeSuccessModal() {
    if (this.showcreategroupmodal == true) {
      this.http.get('http://localhost:3000/api/groups/all').subscribe({
        next: (response: any) => {

          this.groups = response.filter((group: any) => group.organizerId === this.formData.organizerId);
          console.log(this.groups);
          this.length = this.groups.length;
          this.total = this.groups.reduce((acc: any, group: any) => acc + group.totalAmount, 0);

        },
        error: (error) => {
          console.error('Error:', error);
        },
        complete: () => {
          console.log('Request completed.');
        }
      });
      this.showcreategroupmodal = false;
      this.showcreategroup = false;
    }
    else if (this.approved == true) {

      this.approved = false;
    }
    else if (this.reject == true) {
      this.reject = false;
    }
  }
  showrequests() {
    this.request = !this.request;

  }
  rejectUser(groupName: any, userId: any) {
    this.http.post(`http://localhost:3000/api/users/${groupName}/join-request/${userId}`, { action: "reject" }).subscribe({
      next: (response: any) => {
        console.log(response);
        console.log("request rejected")
      },
      error: (error) => {
        console.error('Error:', error);
      },
      complete: () => {
        console.log('Request completed.');
      }
    });
    this.reject = !this.reject;
  }
  approveUser(groupName: any, userId: any) {
    this.http.post(`http://localhost:3000/api/users/${groupName}/join-request/${userId}`, { action: "accept" }).subscribe({
      next: (response: any) => {
        console.log(response);
        console.log("request approved")
      },
      error: (error) => {
        console.error('Error:', error);
      },
      complete: () => {
        console.log('Request completed.');
      }
    });
    for (const key in this.joinRequests) {
      if (key === groupName) {
        this.joinRequests[key] = this.joinRequests[key].filter(user => user.userId !== userId);

        if (this.joinRequests[key].length === 0) {
          delete this.joinRequests[key];
        }
      }
    }


    this.approved = !this.approved;
  }
  setParticipants() {
    this.showParticipants = !this.showParticipants;
  }
  setGroups() {
    this.showGroup = !this.showGroup;
    console.log(this.showGroup);
  }

}

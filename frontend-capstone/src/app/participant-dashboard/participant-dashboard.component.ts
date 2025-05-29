import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { jwtDecode } from "jwt-decode";
import { start } from 'repl';
export interface JwtPayload {
  userId: string;
  userEmail: string;
  userRole: string;
  iat: number;
  exp: number;
};
@Component({
  selector: 'app-participant-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './participant-dashboard.component.html',
  styleUrl: './participant-dashboard.component.css'
})

export class ParticipantDashboardComponent implements OnInit {
placeUserBid: any;

  month: any;



  selectedOption: any;
  allgroups: any;

  options: any = [];
  groupName: any;
  monthlyamount: any;
  totalamount: any;
  interest: any;
  organizerId: any;
  groupId: any;
  showcreategrouprequest: boolean = false;
  showuserprofile: boolean = false;
  token: string = '';
  userName: any;
  userRole: any;
  userNumber: any;
  userId: any;
  userAddress: any;
  userEmail: any; usershow: boolean = false;
  groups: any;
  showdetails: boolean = false;
  totalGroups: any;
  userGroups2: any;
  userGroups: any;
  totalPaid: any;
  setViewUser: boolean = false;
  endDate: any;
  startDate: any;
  months: string[] = []
  userGroups3: any;
  viewGroupId: any;
  matchsummary: any=[];
viewSummary: any;
showConfirmModal: boolean=false;
bidAmount: boolean=false;
showConfirmModal1: any;

  constructor(private http: HttpClient, private router: Router) { }
  ngOnInit(): void {

    const token = localStorage.getItem('token');
    console.log(token);
    if (token != null) {
      console.log(token);
      const decoded = jwtDecode<JwtPayload>(token);
      console.log(decoded.userId)
      console.log(decoded);
      this.http.get(`http://localhost:3000/api/users/${decoded.userId}`).subscribe({
        next: (response: any) => {
          console.log(response);
          this.userName = response.userName;
          this.userRole = response.userRole;
          this.userNumber = response.userMobileNum;
          this.userId = response.userId;
          this.userAddress = response.userAddress;
          this.userEmail = response.userEmail;
          this.token = response.token;
        },
        error: (error) => {
          console.log(error);
        }
      });
      this.http.get('http://localhost:3000/api/groups/all').subscribe({
        next: (response: any) => {
          console.log("group fetched", response);
          console.log(response[0])
          this.allgroups = response;
          this.groups = response.filter((item: any) => {
            return !item.participants.includes(this.userId);
          });
          this.userGroups = response.filter((item: any) => {
            return item.participants.includes(this.userId);
          });
          this.userGroups2 = this.userGroups;
          this.options.push("ALL")
          for (let i = 0; i < this.userGroups.length; i++) {
            this.options.push(this.userGroups[i].groupName);

          }
          this.totalGroups = response.length - this.groups.length;
          console.log(this.userGroups, "user groups");
          this.totalPaid = this.userGroups.reduce((total: any, group: any) => {
            return total + group.totalAmount;
          }, 0);
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
  showuser() {
    this.showuserprofile = !this.showuserprofile;
    console.log(this.showuserprofile);
  }
  showgroups() {
    this.usershow = !this.usershow;
    console.log(this.usershow);
  }
  showgroupdetails(groupName: string) {

    const group = this.groups.find((group: any) => group.groupName === groupName);
    this.groupId = group.groupId;
    this.groupName = group.groupName;
    this.monthlyamount = group.ticketValue;
    this.totalamount = group.totalAmount;
    this.interest = group.interest;
    this.organizerId = group.organizerId;
    this.showdetails = !this.showdetails;
  }
  sendRequestToOrganizer(name: any) {
    this.http.post('http://localhost:3000/api/groups/request', { groupId: this.groupId, userId: this.userId }).
      subscribe({
        next: (response: any) => {
          this.showcreategrouprequest = !this.showcreategrouprequest;
          console.log(response);
        },
        error: (error) => {
          console.log(error);
        }
      });
  }
  closeSuccessModal() {
    this.showcreategrouprequest = false;
  }
  onOptionChange() {
    console.log(this.selectedOption);
    if (this.selectedOption == "ALL") {
      this.userGroups = this.userGroups2;
    }
    else {
      this.userGroups = this.userGroups2.filter((item: any) => {
        console.log(item.groupName, "Group Name");
        return item.groupName === this.selectedOption;
      });
    }

    console.log(this.userGroups, "Afetr the selection opted");
  }
  getMonthsBetween(startDateStr: string, endDateStr: string): string[] {
    const result: string[] = [];
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const current = new Date(startDate);
    console.log(startDateStr, "current");
    while (current <= endDate) {
      const month = current.toLocaleString('default', { month: 'long' });
      const year = current.getFullYear();
      console.log(month, year);
      result.push(`${month} ${year}`);

      current.setMonth(current.getMonth() + 1);
    }
    console.log(result, "result");
    return result;
  }

  ViewUserGroup(groupName: string) {
    console.log(groupName)
    this.groupName=groupName;
    this.userGroups3 = this.allgroups.filter((item: any) => {
      return item.groupName === groupName;
    })
    this.viewGroupId=this.userGroups3[0].groupId
    this.startDate = this.userGroups3[0].startDate;
    this.endDate = this.userGroups3[0].endDate;
    console.log("start Date", this.userGroups3[0].startDate);
    this.months = this.getMonthsBetween(this.startDate, this.endDate)
    console.log(this.months, "mpnths");
    this.setViewUser = true;
    this.matchsummary=[];
  }
  fetchDetails(index: number) {
    this.month=index+1;
    this.matchsummary=[];
    this.http.get(`http://localhost:3000/api/groups/${this.viewGroupId}/monthly-summary/${index+1}/user/${this.userId}`).subscribe({
      next: (response: any) => {
        console.log(response,"after month summary");
        this.matchsummary.push(response);
        this.viewSummary=true;

      },
      error: (error) => {
        console.log(error,"after month summary");
      }
    })
    
  }
  payAmount1(groupId: any,month:any,amount:any) {
    console.log("inside payyyyyy")
    this.http.post(`http://localhost:3000/api/groups/${groupId}/repay`,{userId:this.userId,month:month,amount:amount}).subscribe({
      next: (response: any) => {
        console.log(response, "payment");
        this.fetchDetails(month-1);
        this.showConfirmModal=true; 

      },
      error: (error) => {
        console.log(error, "after month summary");
      }
    })
    
  }
  placeBid() {
    this.placeUserBid=!this.placeUserBid;
    }
  submitBid(groupId:any,month:any,maxBidAmount:any) {
    if(maxBidAmount<this.bidAmount ){
      alert("Bid amount should be less than Maximum bid amount"+maxBidAmount);
    }
    else{
    this.http.post(`http://localhost:3000/api/groups/${groupId}/bid`, { userId: this.userId, bidAmount: this.bidAmount,month:month })
    .subscribe({
      next: (response: any) => {
        console.log(response, "payment");
        this.fetchDetails(month-1);
        this.placeUserBid=false;
      },
      error: (error) => {
        console.log(error, "after month bid");
      }
    })
    }
  }
}
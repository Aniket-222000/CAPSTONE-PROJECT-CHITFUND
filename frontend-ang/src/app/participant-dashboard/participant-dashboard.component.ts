import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-participant-dashboard',
  templateUrl: './participant-dashboard.component.html',
  styleUrls: ['./participant-dashboard.component.css']
})
export class ParticipantDashboardComponent implements OnInit {
  user: any;
  myGroups: any[] = [];
  recentTransactions: any[] = [];
  upcomingPayments: any[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
      this.fetchDashboardData();
    } else {
      this.error = 'User not found. Please login again.';
      this.isLoading = false;
    }
  }

  fetchDashboardData(): void {
    // Fetch user's groups
    this.http.get<any[]>(`http://localhost:3000/api/groups/user/${this.user.userId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    }).subscribe(
      (groups) => {
        this.myGroups = groups;
        this.fetchRecentTransactions();
      },
      (error) => {
        console.error('Error fetching groups:', error);
        this.error = 'Failed to load your groups.';
        this.isLoading = false;
      }
    );
  }

  fetchRecentTransactions(): void {
    // Fetch user's recent transactions
    this.http.get<any[]>(`http://localhost:3000/api/transactions/user/${this.user.userId}?limit=5`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    }).subscribe(
      (transactions) => {
        this.recentTransactions = transactions;
        this.fetchUpcomingPayments();
      },
      (error) => {
        console.error('Error fetching transactions:', error);
        this.error = 'Failed to load your recent transactions.';
        this.isLoading = false;
      }
    );
  }

  fetchUpcomingPayments(): void {
    // This would typically come from a backend endpoint that calculates upcoming payments
    // For now, we'll simulate this with a timeout
    setTimeout(() => {
      this.upcomingPayments = this.myGroups.map(group => ({
        groupId: group.groupId,
        groupName: group.groupName,
        dueDate: this.getNextPaymentDate(),
        amount: group.ticketValue
      }));
      this.isLoading = false;
    }, 500);
  }

  getNextPaymentDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1); // Random date in the next 30 days
    return date.toLocaleDateString();
  }

  navigateToGroups(): void {
    this.router.navigate(['/my-groups']);
  }

  navigateToTransactions(): void {
    this.router.navigate(['/my-transactions']);
  }

  navigateToMonthlyTracker(): void {
    this.router.navigate(['/monthly-tracker']);
  }

  navigateToGroupTransactions(): void {
    this.router.navigate(['/group-transactions']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToGroupDetails(groupId: string): void {
    this.router.navigate([`/groups/${groupId}`]);
  }
}
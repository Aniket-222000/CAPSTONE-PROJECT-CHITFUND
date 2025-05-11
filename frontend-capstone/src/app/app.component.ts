import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomescreenComponent } from './homescreen/homescreen.component';
import { RegisterComponent } from './register/register.component';
import { ParticipantDashboardComponent } from './participant-dashboard/participant-dashboard.component';
import { ParticipantsComponent } from './participants/participants.component';
import { OrganizerDashboardComponent } from './organizer-dashboard/organizer-dashboard.component';
import { GroupsComponent } from './groups/groups.component';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,GroupsComponent,HomescreenComponent,RegisterComponent,ParticipantDashboardComponent,OrganizerDashboardComponent,ParticipantsComponent  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend-capstone';
}

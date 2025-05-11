import { Routes } from '@angular/router';
import { HomescreenComponent } from './homescreen/homescreen.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { ParticipantDashboardComponent } from './participant-dashboard/participant-dashboard.component';
import { AuthGuard } from './auth.guard';
import { OrganizerDashboardComponent } from './organizer-dashboard/organizer-dashboard.component';

export const routes: Routes = [
    
   { path:'',component:HomescreenComponent},
   {path:'register',component:RegisterComponent},
   {path:'login',component:LoginComponent},
   {path:'dashboard-user',component:ParticipantDashboardComponent,canActivate:[AuthGuard]},
   {path:'dashboard-organizer',component:OrganizerDashboardComponent}
    
];

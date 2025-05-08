// ... existing code ...
import { ParticipantDashboardComponent } from './participant-dashboard/participant-dashboard.component';
import { NgModule } from '@angular/core';

@NgModule({
  declarations: [
    // ... existing code ...
    // Remove ParticipantDashboardComponent from declarations
  ],
  imports: [
    ParticipantDashboardComponent // Add it here instead
  ],
  // ... existing code ...
})
export class AppModule { }
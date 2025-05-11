import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantDashboardComponent } from './participant-dashboard.component';

describe('ParticipantDashboardComponent', () => {
  let component: ParticipantDashboardComponent;
  let fixture: ComponentFixture<ParticipantDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipantDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticipantDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

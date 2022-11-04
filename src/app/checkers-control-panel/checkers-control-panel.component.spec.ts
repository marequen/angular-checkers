import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckersControlPanelComponent } from './checkers-control-panel.component';

describe('CheckersControlPanelComponent', () => {
  let component: CheckersControlPanelComponent;
  let fixture: ComponentFixture<CheckersControlPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckersControlPanelComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckersControlPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

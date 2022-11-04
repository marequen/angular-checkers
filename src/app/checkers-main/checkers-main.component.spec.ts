import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckersMainComponent } from './checkers-main.component';

describe('CheckersMainComponent', () => {
  let component: CheckersMainComponent;
  let fixture: ComponentFixture<CheckersMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckersMainComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckersMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

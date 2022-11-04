import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckersBoardSquareComponent } from './checkers-board-square.component';

describe('CheckersBoardSquareComponent', () => {
  let component: CheckersBoardSquareComponent;
  let fixture: ComponentFixture<CheckersBoardSquareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckersBoardSquareComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckersBoardSquareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

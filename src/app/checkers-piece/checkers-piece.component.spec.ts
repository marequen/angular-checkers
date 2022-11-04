import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckersPieceComponent } from './checkers-piece.component';

describe('CheckersPieceComponent', () => {
  let component: CheckersPieceComponent;
  let fixture: ComponentFixture<CheckersPieceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckersPieceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckersPieceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

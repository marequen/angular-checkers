import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckersBoardRowComponent } from './checkers-board-row.component';

describe('CheckersBoardRowComponent', () => {
  let component: CheckersBoardRowComponent;
  let fixture: ComponentFixture<CheckersBoardRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckersBoardRowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckersBoardRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

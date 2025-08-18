import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImsAuth } from './ims-auth';

describe('ImsAuth', () => {
  let component: ImsAuth;
  let fixture: ComponentFixture<ImsAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImsAuth]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImsAuth);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
